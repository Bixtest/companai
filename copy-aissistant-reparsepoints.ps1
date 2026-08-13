$ErrorActionPreference = 'Stop'
$src = 'C:\Users\Ramzi\Downloads\konsult\aissistant-package'
$dst = 'C:\Users\Ramzi\Downloads\companai\aissistant-package'

if (-not (Test-Path -LiteralPath $src)) { throw "Source missing: $src" }
if (-not (Test-Path -LiteralPath $dst)) { throw "Destination missing: $dst" }

$srcFull = (Get-Item -LiteralPath $src -Force).FullName.TrimEnd('\')
$dstFull = (Get-Item -LiteralPath $dst -Force).FullName.TrimEnd('\')
$links = @(Get-ChildItem -LiteralPath $srcFull -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | Sort-Object { $_.FullName.Length })

$created = 0
$skippedExists = 0
$failed = @()

foreach ($link in $links) {
  $rel = $link.FullName.Substring($srcFull.Length).TrimStart('\')
  $destPath = Join-Path $dstFull $rel
  $parent = Split-Path -Parent $destPath
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }
  if (Test-Path -LiteralPath $destPath) {
    $skippedExists++
    continue
  }

  $target = $null
  if ($link.Target -is [array]) { $target = [string]$link.Target[0] } else { $target = [string]$link.Target }
  if ([string]::IsNullOrWhiteSpace($target)) {
    $failed += [pscustomobject]@{Rel=$rel;Reason='Empty target';Type=$link.LinkType;Target=$target}
    continue
  }

  # Rewrite absolute targets that point inside the source tree to the corresponding destination tree.
  if ($target.StartsWith($srcFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    $target = $dstFull + $target.Substring($srcFull.Length)
  }

  try {
    if ($link.PSIsContainer) {
      if ($link.LinkType -eq 'SymbolicLink') {
        New-Item -ItemType SymbolicLink -Path $destPath -Target $target -Force | Out-Null
      } else {
        New-Item -ItemType Junction -Path $destPath -Target $target -Force | Out-Null
      }
    } else {
      New-Item -ItemType SymbolicLink -Path $destPath -Target $target -Force | Out-Null
    }
    $created++
  } catch {
    $failed += [pscustomobject]@{Rel=$rel;Reason=$_.Exception.Message;Type=$link.LinkType;Target=$target}
  }
}

[pscustomobject]@{
  SourceReparsePoints = $links.Count
  Created = $created
  SkippedExisting = $skippedExists
  Failed = $failed.Count
} | Format-List

if ($failed.Count -gt 0) {
  $failed | Select-Object -First 50 | Format-Table -Wrap -AutoSize
  exit 2
}
