$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "D:\Hackathons\Hacktoberfest-Week3\screenshots"
$artDir = "C:\Users\shrey\.gemini\antigravity\brain\7cb8b734-c0e0-4c02-876d-795d9738367c"

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }
if (-not (Test-Path $artDir)) { New-Item -ItemType Directory -Force -Path $artDir | Out-Null }

$screens = @(
    @{ name = "morning";  tab = "digest" },
    @{ name = "tasks";    tab = "attention" },
    @{ name = "inbox";    tab = "inbox" },
    @{ name = "settings"; tab = "settings" }
)

$viewports = @(
    @{ name = "1440"; size = "1440,900" },
    @{ name = "390";  size = "390,844" }
)

$themes = @("light", "dark")

foreach ($s in $screens) {
    foreach ($v in $viewports) {
        foreach ($t in $themes) {
            $fileName = "$($s.name)-$($v.name)-$t.png"
            $destPath = Join-Path $outDir $fileName
            $url = "http://localhost:5173/?tab=$($s.tab)&theme=$t"
            
            Write-Host "Capturing $fileName ($($v.size), $t)..."
            $args = @(
                "--headless",
                "--disable-gpu",
                "--virtual-time-budget=2500",
                "--window-size=$($v.size)",
                "--screenshot=$destPath",
                $url
            )
            Start-Process -FilePath $edge -ArgumentList $args -Wait
            
            # Copy to artifact directory for embedding if needed
            if (Test-Path $destPath) {
                Copy-Item -Path $destPath -Destination (Join-Path $artDir $fileName) -Force
            }
        }
    }
}
Write-Host "All screenshots captured successfully!"
