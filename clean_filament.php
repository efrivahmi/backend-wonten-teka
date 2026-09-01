<?php
$directory = new RecursiveDirectoryIterator('app/Filament/Resources');
$iterator = new RecursiveIteratorIterator($directory);
foreach ($iterator as $info) {
    if (pathinfo($info->getFilename(), PATHINFO_EXTENSION) === 'php') {
        $content = file_get_contents($info->getPathname());
        
        // Match Select::make('company_id')... up to the next comma or closing bracket
        // It typically looks like:
        // Select::make('company_id')
        //     ->relationship('company', 'name')
        //     ->required(),
        $pattern = "/Select::make\('company_id'\)[\s\S]*?(?:,|\)(?=\s*\]|\s*\}))/";
        
        $newContent = preg_replace($pattern, "", $content);
        
        if ($newContent !== $content) {
            file_put_contents($info->getPathname(), $newContent);
            echo "Modified " . $info->getFilename() . "\n";
        }
    }
}

// Also remove from TodayAttendanceWidget
$widgetFile = 'app/Filament/Widgets/TodayAttendanceWidget.php';
if (file_exists($widgetFile)) {
    $widgetContent = file_get_contents($widgetFile);
    $widgetContent = preg_replace("/\/\/ For simplicity, we fetch totals across the system or you could add ->where\('company_id', auth\(\)->user\(\)->company_id\)/", "", $widgetContent);
    file_put_contents($widgetFile, $widgetContent);
}

echo "Done\n";
