param([string]$file)
if (Test-Path $file) {
    [xml]$xml = Get-Content $file
    $nodes = $xml.SelectNodes('//*[@text!="" or @content-desc!=""]')
    foreach ($n in $nodes) {
        $t = $n.GetAttribute('text')
        $d = $n.GetAttribute('content-desc')
        $c = $n.GetAttribute('class')
        $b = $n.GetAttribute('bounds')
        Write-Host "[$c] text='$t' desc='$d' bounds='$b'"
    }
}
