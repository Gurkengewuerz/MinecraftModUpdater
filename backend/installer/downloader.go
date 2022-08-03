package installer

import (
	"io"
	"net/http"
	"os"
)

var client = &http.Client{}

func DownloadFile(filepath string, url string) error {

	// Get the data
	req, err := http.NewRequest("GET", url, nil)
	req.Header.Add("User-Agent", "ModUpdater/v1.0.0 (by mc8051)")
	resp, err := client.Do(req)

	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// Create the file
	out, err := os.Create(filepath)
	if err != nil {
		return err
	}
	defer out.Close()

	// Write the body to file
	_, err = io.Copy(out, resp.Body)
	return err
}
