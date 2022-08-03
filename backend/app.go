package backend

import (
	"context"
	"encoding/json"
	"github.com/Gurkengewuerz/modupdater/backend/installer"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os"
	"path"
	"strings"
)

// App struct
type App struct {
	ctx       context.Context
	installer *installer.Installer
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// Startup is called at application startup
func (a *App) Startup(ctx context.Context) {
	// Perform your setup here
	a.ctx = ctx
	a.installer = installer.NewInstaller(ctx, "install_result")
}

// DOMReady is called after the front-end dom has been loaded
func (a *App) DOMReady(ctx context.Context) {
	a.guessMinecraftDir()

	runtime.EventsOn(ctx, "openDirectoryDialog", func(optionalData ...interface{}) {
		a.openDirectoryDialog()
	})

	runtime.EventsOn(ctx, "startInstall", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		data, ok := optionalData[0].(map[string]interface{})
		if !ok {
			runtime.LogError(ctx, "Failed to parse optionalData on startInstall")
			return
		}

		parsedAsJSON, err := json.Marshal(data)
		if err != nil {
			runtime.LogErrorf(ctx, "Failed to generate JSON %v", err)
			return
		}

		reqData := installer.StartArguments{}
		if err := json.Unmarshal(parsedAsJSON, &reqData); err != nil {
			runtime.LogErrorf(ctx, "Failed to parse generated JSON %v", err)
			return
		}

		a.installer.Start(reqData)
	})

	runtime.EventsOn(ctx, "cancelInstall", func(optionalData ...interface{}) {
		a.installer.Stop()
	})

	runtime.EventsOn(ctx, "notification", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		data, ok := optionalData[0].(map[string]interface{})
		if !ok {
			runtime.LogError(ctx, "Failed to parse optionalData on notification")
			return
		}

		parsedAsJSON, err := json.Marshal(data)
		if err != nil {
			runtime.LogErrorf(ctx, "Failed to generate JSON %v", err)
			return
		}

		reqData := struct {
			DialogType string `json:"type"`
			Title      string `json:"title"`
			Message    string `json:"message"`
		}{}
		if err := json.Unmarshal(parsedAsJSON, &reqData); err != nil {
			runtime.LogErrorf(ctx, "Failed to parse generated JSON %v", err)
			return
		}

		_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.DialogType(reqData.DialogType),
			Title:   reqData.Title,
			Message: reqData.Message,
		})
	})

	runtime.EventsOn(ctx, "getMinecraftVersions", func(optionalData ...interface{}) {
		if len(optionalData) == 0 {
			return
		}
		checkDir, ok := optionalData[0].(string)
		if !ok {
			runtime.LogError(ctx, "Failed to parse optionalData on getMinecraftVersions")
			return
		}
		runtime.EventsEmit(ctx, "getMinecraftVersions_result", a.installer.GetMCVersions(checkDir))
	})
}

// Shutdown is called at application termination
func (a *App) Shutdown(ctx context.Context) {
	// Perform your teardown here
}

func (a *App) guessMinecraftDir() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return
	}
	guessedPath := strings.ReplaceAll(path.Clean(path.Join(configDir, ".minecraft")), "\\", "/")

	folderInfo, err := os.Stat(guessedPath)
	if folderInfo != nil {
		// path to mc exists
		runtime.EventsEmit(a.ctx, "minecraftPath", guessedPath)
	}
	runtime.LogDebugf(a.ctx, "Guessed default .minecraft dir %s: %v", guessedPath, folderInfo)
}

func (a *App) openDirectoryDialog() {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return
	}
	dialogRes, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		DefaultDirectory:     configDir,
		Title:                "Select Minecraft Folder",
		Filters:              nil,
		ShowHiddenFiles:      true,
		CanCreateDirectories: false,
	})
	if err != nil {
		return
	}
	// also called when canceled
	if dialogRes == "" {
		return
	}
	runtime.EventsEmit(a.ctx, "openDirectoryDialog_result", dialogRes)
}
