<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Nama produk lama: Wonten Teka. --}}
    <title>e-Absensi Lemdiklat Taruna Nusantara Indonesia</title>
    <link rel="icon" type="image/png" sizes="any" href="{{ asset('images/lemdiklat-logo.png') }}?v=20260916-4">
    <link rel="shortcut icon" type="image/png" href="{{ asset('images/lemdiklat-logo.png') }}?v=20260916-4">
    <link rel="apple-touch-icon" href="{{ asset('images/lemdiklat-logo.png') }}?v=20260916-4">
    
    <!-- Meta tag for Vite React Fast Refresh -->
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
</head>
<body class="antialiased bg-gray-50 text-gray-900">
    <div id="app"></div>
</body>
</html>
