param(
    [string]$Tag = "latest",
    [string]$Image = "sagittadigital/xcommerce",
    [string]$EnvFile = ".env.build",
    [string]$FallbackEnvFile = "apps/web/.env.local",
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return @{}
    }

    $vars = @{}
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $key = $parts[0].Trim()
            $value = $parts[1].Trim().Trim('"').Trim("'")
            $vars[$key] = $value
        }
    }
    return $vars
}

function Get-BuildVar {
    param(
        [hashtable]$Primary,
        [hashtable]$Fallback,
        [string]$Name
    )

    if ($Primary.ContainsKey($Name) -and $Primary[$Name]) {
        return $Primary[$Name]
    }
    if ($Fallback.ContainsKey($Name) -and $Fallback[$Name]) {
        return $Fallback[$Name]
    }
    return $null
}

$primary = Read-EnvFile $EnvFile
$fallback = Read-EnvFile $FallbackEnvFile

$supabaseUrl = Get-BuildVar $primary $fallback "VITE_SUPABASE_URL"
$supabaseKey = Get-BuildVar $primary $fallback "VITE_SUPABASE_ANON_KEY"

if (-not $supabaseUrl) {
    throw "VITE_SUPABASE_URL ausente. Crie $EnvFile a partir de .env.build.example"
}
if (-not $supabaseKey) {
    throw "VITE_SUPABASE_ANON_KEY ausente. Crie $EnvFile a partir de .env.build.example"
}

$fullTag = "${Image}:${Tag}"
Write-Host "Building $fullTag ..."
Write-Host "  VITE_SUPABASE_URL = $supabaseUrl"

docker build `
    --build-arg "VITE_SUPABASE_URL=$supabaseUrl" `
    --build-arg "VITE_SUPABASE_ANON_KEY=$supabaseKey" `
    -t $fullTag `
    .

if ($LASTEXITCODE -ne 0) {
    throw "docker build falhou com código $LASTEXITCODE"
}

if (-not $SkipPush) {
    Write-Host "Pushing $fullTag ..."
    docker push $fullTag
    if ($LASTEXITCODE -ne 0) {
        throw "docker push falhou com código $LASTEXITCODE"
    }
}

Write-Host "Concluído: $fullTag"
