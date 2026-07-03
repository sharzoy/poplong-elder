param(
    [string]$Source = "D:\Projects\paopaolong-elder\assets\icon.png",
    [string]$ResDir = "D:\Projects\paopaolong-elder\android\app\src\main\res"
)

Add-Type -AssemblyName System.Drawing

function Save-IconSize {
    param(
        [System.Drawing.Bitmap]$Src,
        [int]$Size,
        [string]$Path
    )
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(255, 42, 16, 96))
    $g.DrawImage($Src, 0, 0, $Size, $Size)
    $g.Dispose()
    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$srcImg = [System.Drawing.Bitmap]::FromFile($Source)

$legacy = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$adaptive = @{
    "mipmap-mdpi"    = 108
    "mipmap-hdpi"    = 162
    "mipmap-xhdpi"   = 216
    "mipmap-xxhdpi"  = 324
    "mipmap-xxxhdpi" = 432
}

foreach ($entry in $legacy.GetEnumerator()) {
    Save-IconSize $srcImg $entry.Value (Join-Path $ResDir "$($entry.Key)\ic_launcher.png")
    Save-IconSize $srcImg $entry.Value (Join-Path $ResDir "$($entry.Key)\ic_launcher_round.png")
}

foreach ($entry in $adaptive.GetEnumerator()) {
    Save-IconSize $srcImg $entry.Value (Join-Path $ResDir "$($entry.Key)\ic_launcher_foreground.png")
}

$srcImg.Dispose()

$bgPath = Join-Path $ResDir "values\ic_launcher_background.xml"
@'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#2A1060</color>
</resources>
'@ | Set-Content -Path $bgPath -Encoding UTF8

Write-Host "Android icons generated in $ResDir"
