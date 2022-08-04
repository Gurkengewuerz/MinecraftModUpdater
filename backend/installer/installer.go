package installer

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"io/ioutil"
	"os"
	"path"
	"time"
)

type Installer struct {
	ctx         context.Context
	eventResult string
	args        StartArguments
	isRunning   bool
	isFinish    bool
	isCancel    bool
}

type StartArguments struct {
	ProfileName           string `json:"name"`
	GameVersion           string `json:"mcVersion"`
	FabricVersion         string `json:"fabricLoader"`
	MCDir                 string `json:"mcDir"`
	Icon                  string `json:"icon"`
	Mods                  []Mod  `json:"mods"`
	GeneratedFProfileName string `json:"-"`
	DirVersion            string `json:"-"`
	DirProfile            string `json:"-"`
	FileProfileJson       string `json:"-"`
}

type InstallerResult struct {
	IsRunning  bool
	IsFinish   bool
	IsCancel   bool
	Percentage int
	State      string
}

func NewInstaller(ctx context.Context, eventResult string) *Installer {
	return &Installer{ctx: ctx, eventResult: eventResult}
}

func (i *Installer) Start(args StartArguments) {
	if i.isRunning {
		return
	}

	args.GeneratedFProfileName = fmt.Sprintf("%s-%s-%s", "fabric-loader", args.FabricVersion, args.GameVersion)
	args.DirVersion = path.Clean(path.Join(args.MCDir, "versions"))
	args.DirProfile = path.Clean(path.Join(args.DirVersion, args.GeneratedFProfileName))
	args.FileProfileJson = path.Clean(path.Join(args.DirProfile, fmt.Sprintf("%s.json", args.GeneratedFProfileName)))

	runtime.LogInfof(i.ctx, "Running installer in directory %s for MC %s with %d mods", args.MCDir, args.GameVersion, len(args.Mods))
	i.args = args
	i.isRunning = true
	i.isFinish = false
	i.isCancel = false

	go i.run()
}

func (i *Installer) Stop() {
	runtime.LogInfo(i.ctx, "Stopping installer")

	i.isRunning = false
	i.isCancel = true
}

func (i *Installer) GetMCVersions(mcDir string) []string {
	retData := []string{}
	versions := path.Clean(path.Join(mcDir, "versions"))
	if _, err := os.Stat(versions); errors.Is(err, os.ErrNotExist) {
		return retData
	}

	files, err := ioutil.ReadDir(versions)
	if err != nil {
		return retData
	}

	for _, file := range files {
		if !file.IsDir() {
			continue
		}
		retData = append(retData, file.Name())
	}
	return retData
}

func (i *Installer) notify(state string, percent int) {
	runtime.EventsEmit(i.ctx, i.eventResult, InstallerResult{
		IsRunning:  i.isRunning,
		IsFinish:   i.isFinish,
		IsCancel:   i.isCancel,
		Percentage: percent,
		State:      state,
	})
}

func (i *Installer) installFabric(customDir string) error {
	// profileName must match "id" in .json
	runtime.LogInfof(i.ctx, "Downloading and installing Fabric to %s", i.args.GeneratedFProfileName)

	folderInfo, _ := os.Stat(i.args.DirProfile)
	if folderInfo == nil {
		runtime.LogInfo(i.ctx, "profileDir does not exists. Creating...")
		err := os.MkdirAll(i.args.DirProfile, 0755)
		if err != nil {
			runtime.LogError(i.ctx, "Failed to create profileDir")
			return err
		}
	}

	/*
	    This is a fun meme
	   The vanilla launcher assumes the profile name is the same name as a maven artifact, how ever our profile name is a combination of 2
	   (mappings and loader). The launcher will also accept any jar with the same name as the profile, it doesnt care if its empty
	*/

	dummyJar := path.Clean(path.Join(i.args.DirProfile, fmt.Sprintf("%s.jar", i.args.GeneratedFProfileName)))

	_ = os.Remove(dummyJar)
	file, err := os.Create(dummyJar)
	if err != nil {
		runtime.LogError(i.ctx, "Failed to create dummyjar")
		return err
	}
	defer file.Close()

	runtime.LogInfo(i.ctx, "Downloading Fabric profile...")
	url := fmt.Sprintf("https://meta.fabricmc.net/v2/versions/loader/%s/%s/profile/json", i.args.GameVersion, i.args.FabricVersion)
	err = DownloadFile(i.args.FileProfileJson, url)
	if err != nil {
		runtime.LogErrorf(i.ctx, "Failed to download fabric loader profile %s to %s", url, i.args.FileProfileJson)
		return err
	}

	runtime.LogInfo(i.ctx, "Creating launcher profile...")
	launcherProfiles := path.Clean(path.Join(i.args.MCDir, "launcher_profiles.json"))
	lpFile, err := ioutil.ReadFile(launcherProfiles)
	if err != nil {
		runtime.LogErrorf(i.ctx, "Failed to read launcher profiles at %s", launcherProfiles)
		return err
	}
	rawProfiles := make(map[string]interface{})
	err = json.Unmarshal(lpFile, &rawProfiles)
	if err != nil {
		runtime.LogError(i.ctx, "Failed to parse launcher profiles")
		return err
	}
	rawProfilesList, ok := rawProfiles["profiles"].(map[string]interface{})
	if !ok {
		runtime.LogError(i.ctx, "Failed to read profiles from launcher profiles")
		return err
	}

	now := time.Now().Format(time.RFC3339)
	newProfile := make(map[string]interface{})
	newProfile["gameDir"] = customDir
	newProfile["lastUsed"] = now
	newProfile["created"] = now
	newProfile["lastVersionId"] = i.args.GeneratedFProfileName
	newProfile["name"] = i.args.ProfileName
	newProfile["type"] = "custom"

	if i.args.Icon != "" {
		newProfile["icon"] = i.args.Icon
	}

	rawProfilesList[i.args.GeneratedFProfileName] = newProfile
	rawProfiles["profiles"] = rawProfilesList

	dataBytes, err := json.MarshalIndent(rawProfiles, "", "  ")
	if err != nil {
		runtime.LogError(i.ctx, "Failed to marshal json for launcher profiles")
		return err
	}

	err = ioutil.WriteFile(launcherProfiles, dataBytes, 0755)
	if err != nil {
		runtime.LogError(i.ctx, "Failed to write launcher profiles")
		return err
	}
	runtime.LogInfo(i.ctx, "Launcher Profile created")
	return nil
}

func (i *Installer) cleanupMods(modDir string) error {
	runtime.LogInfo(i.ctx, "Performing mod cleanup from old mods")
	files, err := ioutil.ReadDir(modDir)
	if err != nil {
		return err
	}

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		isInCurrentPack := false
		for _, mod := range i.args.Mods {
			if mod.FileName() == file.Name() {
				isInCurrentPack = true
				break
			}
		}

		if !isInCurrentPack {
			err := os.Remove(path.Join(modDir, file.Name()))
			runtime.LogInfof(i.ctx, "Removing %s", file.Name())
			if err != nil {
				runtime.LogErrorf(i.ctx, "Failed to remove %s", file.Name())
				return err
			}
		}
	}
	return nil
}

func (i *Installer) copyOptions(customDir string) error {
	origOptions := path.Clean(path.Join(i.args.MCDir, "options.txt"))
	if _, err := os.Stat(origOptions); errors.Is(err, os.ErrNotExist) {
		return err
	}

	customOptions := path.Clean(path.Join(customDir, "options.txt"))
	if _, err := os.Stat(customOptions); errors.Is(err, os.ErrNotExist) {
		bytesRead, err := ioutil.ReadFile(origOptions)
		if err != nil {
			runtime.LogErrorf(i.ctx, "Failed to read original options.txt from %s", origOptions)
			return err
		}

		err = ioutil.WriteFile(customOptions, bytesRead, 0755)
		if err != nil {
			runtime.LogErrorf(i.ctx, "Failed to write new options.txt to %s", customOptions)
			return err
		}
		runtime.LogInfo(i.ctx, "Copied options.txt")
	} else {
		runtime.LogInfo(i.ctx, "Skipping options.txt copy. Already exists")
	}
	return nil
}

func (i *Installer) run() {
	customDir := path.Clean(path.Join(i.args.MCDir, "..", ".modupdater"))
	modDir := path.Clean(path.Join(customDir, "mods"))
	err := os.MkdirAll(modDir, 0755)
	if err != nil {
		i.isRunning = false
		i.isCancel = true
		i.notify("MKMODDIR", 0)
		runtime.LogErrorf(i.ctx, "Failed to create mod dir %s", modDir)
		return
	}
	_ = i.copyOptions(customDir)

	modLen := len(i.args.Mods)
	index := 0
	for i.isRunning {
		if index >= modLen {
			if modLen > 0 {
				i.notify("FABRIC", 90)
				err := i.installFabric(customDir)
				if err != nil {
					i.isRunning = false
					i.isCancel = true
					i.notify("FABRIC", 90)
					break
				}

				i.notify("CLEANUP", 95)
				err = i.cleanupMods(modDir)
				if err != nil {
					i.isRunning = false
					i.isCancel = true
					i.notify("CLEANUP", 95)
					break
				}
			}
			i.isRunning = false
			i.isFinish = true
			break
		}

		// Mod download equals a maximum of 90%. This way we have room for fabric profile installation and mod cleanup
		ModsMaxPercentage := float32(90)
		percentBefore := float32(index) / float32(modLen)
		percentAfter := float32(index+1) / float32(modLen)

		mod := i.args.Mods[index]
		i.notify(mod.Name, int(ModsMaxPercentage*percentBefore))
		runtime.LogInfof(i.ctx, "Installing %s", mod.Name)
		err := mod.Download(modDir)
		if err != nil {
			i.isRunning = false
			i.isCancel = true
			i.notify(mod.Name, int(ModsMaxPercentage*percentAfter))
			runtime.LogErrorf(i.ctx, "Failed to install %s", mod.Name)
			break
		}
		index++
	}

	if i.isCancel {
		i.notify("CANCEL", 0)
		return
	}

	i.notify("FINISH", 100)
}
