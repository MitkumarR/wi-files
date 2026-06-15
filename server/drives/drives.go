package drives

import (
	"encoding/json"
	"net/http"
	"os/exec"
)

type BlockDevice struct {
	Name       string        `json:"name"`
	Mountpoint *string       `json:"mountpoint"`
	Size       string        `json:"size"`
	Type       string        `json:"type"`
	Children   []BlockDevice `json:"children,omitempty"`
}

type DriveInfo struct {
	Name       string `json:"name"`
	Mountpoint string `json:"mountpoint"`
	Size       string `json:"size"`
	Type       string `json:"type"`
}

func extractDrives(devices []BlockDevice) []DriveInfo {
	var drives []DriveInfo
	for _, dev := range devices {
		if dev.Type != "loop" && dev.Mountpoint != nil && *dev.Mountpoint != "" {
			drives = append(drives, DriveInfo{
				Name:       dev.Name,
				Mountpoint: *dev.Mountpoint,
				Size:       dev.Size,
				Type:       dev.Type,
			})
		}
		if len(dev.Children) > 0 {
			drives = append(drives, extractDrives(dev.Children)...)
		}
	}
	return drives
}

func HandleDrives(w http.ResponseWriter, r *http.Request) {
	cmd := exec.Command("lsblk", "-J", "-o", "NAME,MOUNTPOINT,SIZE,TYPE")
	output, err := cmd.Output()
	if err != nil {
		http.Error(w, "Failed to detect drives", http.StatusInternalServerError)
		return
	}

	var lsblkResp struct {
		Blockdevices []BlockDevice `json:"blockdevices"`
	}
	if err := json.Unmarshal(output, &lsblkResp); err != nil {
		http.Error(w, "Failed to parse drive data", http.StatusInternalServerError)
		return
	}

	validDrives := extractDrives(lsblkResp.Blockdevices)
	if validDrives == nil {
		validDrives = make([]DriveInfo, 0)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(validDrives)
}
