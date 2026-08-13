$ErrorActionPreference = 'Continue'
$src = 'C:\Users\Ramzi\Downloads\konsult\aissistant-package'
$dst = 'C:\Users\Ramzi\Downloads\companai\aissistant-package'
$srcFull = (Get-Item -LiteralPath $src -Force).FullName.TrimEnd('\')
$dstFull = (Get-Item -LiteralPath $dst -Force).FullName.TrimEnd('\')

function Get-TreeRows($root) {
  $rootFull = (Get-Item -LiteralPath $root -Force).FullName.TrimEnd('\')
  $rows = New-Object System.Collections.Generic.List[object]
  $items = @(Get-ChildItem -LiteralPath $rootFull -Recurse -Force -ErrorAction SilentlyContinue)
  foreach ($i in $items) {
    $rel = $i.FullName.Substring($rootFull.Length).TrimStart('\')
    $isRp = (($i.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
    $type = if ($i.PSIsContainer) { if($isRp){'dirlink'}else{'dir'} } else { if($isRp){'filelink'}else{'file'} }
    $target = $null
    if ($isRp) {
      try { if ($i.Target -is [array]) { $target = [string]$i.Target[0] } else { $target = [string]$i.Target } } catch { $target = '' }
      if ($target -and $target.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $target = '<ROOT>' + $target.Substring($rootFull.Length)
      }
    }
    $rows.Add([pscustomobject]@{Rel=$rel; Type=$type; Bytes=if($i.PSIsContainer){0}else{[int64]$i.Length}; LinkType=if($isRp){$i.LinkType}else{''}; Target=$target}) | Out-Null
  }
  return $rows
}

$srcRows = @(Get-TreeRows $srcFull)
$dstRows = @(Get-TreeRows $dstFull)
$dstByRel = @{}
foreach ($r in $dstRows) { $dstByRel[$r.Rel] = $r }
$srcByRel = @{}
foreach ($r in $srcRows) { $srcByRel[$r.Rel] = $r }

$missing = New-Object System.Collections.Generic.List[object]
$mismatch = New-Object System.Collections.Generic.List[object]
foreach ($s in $srcRows) {
  if (-not $dstByRel.ContainsKey($s.Rel)) { $missing.Add($s) | Out-Null; continue }
  $d = $dstByRel[$s.Rel]
  if ($s.Type -ne $d.Type -or ($s.Type -eq 'file' -and $s.Bytes -ne $d.Bytes) -or (($s.Type -like '*link') -and ($s.LinkType -ne $d.LinkType -or $s.Target -ne $d.Target))) {
    $mismatch.Add([pscustomobject]@{Rel=$s.Rel; SrcType=$s.Type; DstType=$d.Type; SrcBytes=$s.Bytes; DstBytes=$d.Bytes; SrcLinkType=$s.LinkType; DstLinkType=$d.LinkType; SrcTarget=$s.Target; DstTarget=$d.Target}) | Out-Null
  }
}

$extra = New-Object System.Collections.Generic.List[object]
foreach ($d in $dstRows) { if (-not $srcByRel.ContainsKey($d.Rel)) { $extra.Add($d) | Out-Null } }

$srcStats = $srcRows | Group-Object Type | ForEach-Object { [pscustomobject]@{Side='source';Type=$_.Name;Count=$_.Count;Bytes=[int64](($_.Group|Measure-Object Bytes -Sum).Sum)} }
$dstStats = $dstRows | Group-Object Type | ForEach-Object { [pscustomobject]@{Side='dest';Type=$_.Name;Count=$_.Count;Bytes=[int64](($_.Group|Measure-Object Bytes -Sum).Sum)} }

'=== STATS ==='
$srcStats + $dstStats | Sort-Object Type,Side | Format-Table -AutoSize
'=== SUMMARY ==='
[pscustomobject]@{
  MissingTotal=$missing.Count
  MissingRegularFiles=@($missing | Where-Object Type -eq 'file').Count
  MissingFileLinks=@($missing | Where-Object Type -eq 'filelink').Count
  MissingDirLinks=@($missing | Where-Object Type -eq 'dirlink').Count
  MissingDirs=@($missing | Where-Object Type -eq 'dir').Count
  MismatchTotal=$mismatch.Count
  ExtraTotal=$extra.Count
} | Format-List
'=== MISSING SAMPLE ==='
$missing | Select-Object -First 80 | Format-Table -Wrap -AutoSize
'=== MISMATCH SAMPLE ==='
$mismatch | Select-Object -First 80 | Format-Table -Wrap -AutoSize
'=== EXTRA SAMPLE ==='
$extra | Select-Object -First 40 | Format-Table -Wrap -AutoSize
if ($missing.Count -or $mismatch.Count) { exit 3 } else { exit 0 }
