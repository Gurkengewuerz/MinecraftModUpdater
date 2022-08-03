package installer

import (
	"fmt"
	"path"
	"strings"
)

type Mod struct {
	Name string `json:"name"`
	URL  string `json:"download"`
}

func (m *Mod) FileName() string {
	modName := strings.ToLower(m.Name)
	modName = strings.ReplaceAll(modName, ".", "-")
	modName = strings.ReplaceAll(modName, " ", "_")
	return fmt.Sprintf("%s.jar", modName)
}

func (m *Mod) Download(modDir string) error {
	return DownloadFile(path.Join(modDir, m.FileName()), m.URL)
}
