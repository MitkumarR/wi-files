package files

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
)

func getCachePath(originalPath string) string {
	hash := fmt.Sprintf("%x", md5.Sum([]byte(originalPath)))
	cacheDir := filepath.Join(os.TempDir(), "wi-files-thumbs")
	os.MkdirAll(cacheDir, 0755)
	return filepath.Join(cacheDir, hash+".jpg")
}

func HandleThumbnail(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path required", http.StatusBadRequest)
		return
	}

	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		http.Error(w, "File not found or is directory", http.StatusBadRequest)
		return
	}

	cachePath := getCachePath(path)
	cacheInfo, err := os.Stat(cachePath)
	if err == nil && cacheInfo.ModTime().After(info.ModTime()) {
		w.Header().Set("Content-Type", "image/jpeg")
		w.Header().Set("Cache-Control", "public, max-age=86400")
		http.ServeFile(w, r, cachePath)
		return
	}

	ext := strings.ToLower(filepath.Ext(path))
	var thumbData []byte

	switch ext {
	case ".jpg", ".jpeg", ".png", ".gif", ".bmp":
		thumbData, err = generateImageThumbnail(path)
	case ".mp4", ".avi", ".mkv", ".webm", ".mov":
		thumbData, err = generateVideoThumbnail(path)
	case ".pdf":
		thumbData, err = generatePdfThumbnail(path)
	default:
		http.Error(w, "Unsupported file type for thumbnail", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, "Failed to generate thumbnail: "+err.Error(), http.StatusInternalServerError)
		return
	}

	os.WriteFile(cachePath, thumbData, 0644)

	w.Header().Set("Content-Type", "image/jpeg")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Write(thumbData)
}

func generateImageThumbnail(path string) ([]byte, error) {
	srcImage, err := imaging.Open(path, imaging.AutoOrientation(true))
	if err != nil {
		return nil, err
	}
	thumbImage := imaging.Thumbnail(srcImage, 200, 200, imaging.Lanczos)
	var buf bytes.Buffer
	err = imaging.Encode(&buf, thumbImage, imaging.JPEG)
	return buf.Bytes(), err
}

func generateVideoThumbnail(path string) ([]byte, error) {
	cmd := exec.Command("ffmpeg", "-i", path, "-ss", "00:00:01.000", "-vframes", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("ffmpeg error (is it installed?): %v", err)
	}
	return out.Bytes(), nil
}

func generatePdfThumbnail(path string) ([]byte, error) {
	cmd := exec.Command("pdftoppm", "-jpeg", "-f", "1", "-l", "1", "-singlefile", path)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return nil, fmt.Errorf("pdftoppm error: %v", err)
	}
	return out.Bytes(), nil
}
