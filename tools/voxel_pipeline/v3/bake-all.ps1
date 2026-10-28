param(
    [int]$Jobs = 4,
    [string]$Filter = ""
)

# Bake every registered 512³ asset in parallel, then rebuild the index.
#
# Each asset is independent and the bake is deterministic, so the roster is
# simply split across Node processes. On a typical desktop 4 jobs is the sweet
# spot; 512³ needs no smaller canvas and no special hardware.
#
#   .\bake-all.ps1                 # 4 parallel jobs, whole roster
#   .\bake-all.ps1 -Jobs 8         # more parallelism
#   .\bake-all.ps1 -Filter tank    # only assets whose id contains "tank"
#   .\bake-all.ps1 -Jobs 1         # serial, easiest to watch

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $here "..\..\..")
$baker = Join-Path $here "bake.mjs"

Write-Host "Voxel 512³ pipeline — parallel bake" -ForegroundColor Cyan

$ids = & node $baker --list | ForEach-Object { ($_ -split ' ')[0] }
if ($Filter -ne "") { $ids = $ids | Where-Object { $_ -like "*$Filter*" } }
if (-not $ids) { Write-Host "nothing to bake"; exit 0 }

Write-Host ("assets: {0}   jobs: {1}" -f $ids.Count, $Jobs)

$chunks = @()
for ($i = 0; $i -lt $Jobs; $i++) {
    $chunks += ,@($ids | Where-Object { [array]::IndexOf($ids, $_) % $Jobs -eq $i })
}

$start = Get-Date
$procs = @()
for ($i = 0; $i -lt $chunks.Count; $i++) {
    if (-not $chunks[$i] -or $chunks[$i].Count -eq 0) { continue }
    $list = ($chunks[$i] -join ',')
    $log = Join-Path $env:TEMP ("voxel-bake-{0}.log" -f $i)
    $p = Start-Process -FilePath "node" `
        -ArgumentList @($baker, "--only", $list) `
        -WorkingDirectory $root -NoNewWindow -PassThru `
        -RedirectStandardOutput $log -RedirectStandardError ($log + ".err")
    $procs += [pscustomobject]@{ Proc = $p; Log = $log; Chunk = $chunks[$i] }
}

foreach ($entry in $procs) {
    $entry.Proc.WaitForExit()
    Get-Content $entry.Log | ForEach-Object { Write-Host $_ }
    $err = $entry.Log + ".err"
    if ((Test-Path $err) -and (Get-Content $err -Raw).Trim() -ne "") {
        Write-Host (Get-Content $err -Raw) -ForegroundColor Red
    }
}

& node $baker --index-only

$seconds = [math]::Round(((Get-Date) - $start).TotalSeconds, 1)
Write-Host ("done in {0}s" -f $seconds) -ForegroundColor Green
