<?php
$directory = new RecursiveDirectoryIterator('app/Filament/Resources');
$iterator = new RecursiveIteratorIterator($directory);
foreach ($iterator as $info) {
    if (pathinfo($info->getFilename(), PATHINFO_EXTENSION) === 'php' && str_contains($info->getPathname(), 'Tables')) {
        $content = file_get_contents($info->getPathname());
        
        $pattern = "/\s*TextColumn::make\('company\.name'\)(?:\s*->[a-zA-Z0-9_]+\([^)]*\))*\s*,?/";
        $newContent = preg_replace($pattern, "", $content);
        
        if ($newContent !== $content) {
            file_put_contents($info->getPathname(), $newContent);
            echo "Cleaned " . $info->getFilename() . "\n";
        }
    }
}
echo "Done\n";
