encode() {
    echo "[+] Encoding $1.mp4"
    ffmpeg -i $1.avi -c:v libx265 -crf 20 -c:a aac -b:a 128k $1.mp4
    echo "[+] Encoding $1.webm"
    ffmpeg -i $1.avi -c:v libvpx-vp9 -b:v 0 -crf 40 -pass 1 -an -f webm -deadline best /dev/null && \
    ffmpeg -i $1.avi -c:v libvpx-vp9 -b:v 0 -crf 40 -pass 2 -deadline best -c:a libopus $1.webm
}
