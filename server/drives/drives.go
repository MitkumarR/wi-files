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
	FsUsed     *string       `json:"fsused"`
	FsSize     *string       `json:"fssize"`
	FsUsePct   *string       `json:"fsuse%"`
	Children   []BlockDevice `json:"children,omitempty"`
}

type DriveInfo struct {
	Name       string `json:"name"`
	Mountpoint string `json:"mountpoint"`
	Size       string `json:"size"`
	Type       string `json:"type"`
	UsedSpace  string `json:"usedSpace"`
	TotalSpace string `json:"totalSpace"`
	UsedPct    string `json:"usedPct"`
}

func extractDrives(devices []BlockDevice) []DriveInfo {
	var drives []DriveInfo
	for _, dev := range devices {
		if dev.Type != "loop" && dev.Mountpoint != nil && *dev.Mountpoint != "" {
			used := ""
			if dev.FsUsed != nil {
				used = *dev.FsUsed
			}
			total := ""
			if dev.FsSize != nil {
				total = *dev.FsSize
			}
			pct := ""
			if dev.FsUsePct != nil {
				pct = *dev.FsUsePct
			}
			
			drives = append(drives, DriveInfo{
				Name:       dev.Name,
				Mountpoint: *dev.Mountpoint,
				Size:       dev.Size,
				Type:       dev.Type,
				UsedSpace:  used,
				TotalSpace: total,
				UsedPct:    pct,
			})
		}
		if len(dev.Children) > 0 {
			drives = append(drives, extractDrives(dev.Children)...)
		}
	}
	return drives
}

func HandleDrives(w http.ResponseWriter, r *http.Request) {
	cmd := exec.Command("lsblk", "-J", "-o", "NAME,MOUNTPOINT,SIZE,TYPE,FSUSED,FSSIZE,FSUSE%")
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
