<?php
\App\Models\Setting::updateOrCreate(
    ['key' => 'geofence'],
    ['value' => [
        'latitude' => -6.1754, 
        'longitude' => 106.8272, 
        'geofence_radius_meters' => 500
    ]]
);
echo "Geofence set successfully!\n";
