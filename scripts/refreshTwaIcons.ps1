$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceCandidates = @(
  (Join-Path $repoRoot 'public\icons\maskable.png'),
  (Join-Path $repoRoot 'public\icons\maskable-512.png')
)
$sourcePath = $sourceCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

if (-not $sourcePath) {
  throw "Source icon not found. Expected one of: $($sourceCandidates -join ', ')"
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

function Save-ResizedPng {
  param(
    [System.Drawing.Image] $Source,
    [string] $Path,
    [int] $Size
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($Source, 0, 0, $Size, $Size)
  $graphics.Dispose()
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}

$targets = @(
  @{ Path = 'public\icons\maskable-512.png'; Size = 512 },
  @{ Path = 'public\icons\icon-512.png'; Size = 512 },
  @{ Path = 'public\icons\icon-192.png'; Size = 192 },
  @{ Path = 'android-twa\store_icon.png'; Size = 512 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-mdpi\ic_launcher.png'; Size = 48 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-hdpi\ic_launcher.png'; Size = 72 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xhdpi\ic_launcher.png'; Size = 96 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxhdpi\ic_launcher.png'; Size = 144 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png'; Size = 192 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-mdpi\ic_maskable.png'; Size = 82 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-hdpi\ic_maskable.png'; Size = 123 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xhdpi\ic_maskable.png'; Size = 164 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxhdpi\ic_maskable.png'; Size = 246 },
  @{ Path = 'android-twa\app\src\main\res\mipmap-xxxhdpi\ic_maskable.png'; Size = 328 }
)

try {
  foreach ($target in $targets) {
    $targetPath = Join-Path $repoRoot $target.Path
    if ((Resolve-Path -LiteralPath $sourcePath).Path -eq $targetPath) {
      Write-Output "Skipped $($target.Path) (source file)"
      continue
    }
    Save-ResizedPng -Source $source -Path $targetPath -Size $target.Size
    Write-Output "Updated $($target.Path) ($($target.Size)x$($target.Size))"
  }
} finally {
  $source.Dispose()
}
