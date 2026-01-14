@echo off
setlocal EnableExtensions

REM ==============================
REM  Build + Open (Auto-sync + Preview)
REM ==============================

cd /d "%~dp0"

echo.
echo [1/5] Cek struktur folder...

if not exist "tools\build_posts.py" goto :ERR_NO_TOOL
if not exist "artikel" goto :ERR_NO_ARTIKEL

echo OK: Struktur ditemukan.

echo.
echo [2/5] Cek Python...

set "PYTHON="
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 --version >nul 2>&1
  if %errorlevel%==0 set "PYTHON=py -3"
)

if not defined PYTHON (
  where python >nul 2>&1
  if %errorlevel%==0 set "PYTHON=python"
)

if not defined PYTHON goto :ERR_NO_PY

%PYTHON% --version

echo.
echo [3/5] Jalankan generator (posts + search index)...
%PYTHON% tools\build_posts.py --also-search-index
if errorlevel 1 goto :ERR_BUILD

echo.
echo [4/5] Buka folder website...
start "" "%cd%"

echo.
echo [5/5] Buka halaman Catatan untuk preview...
if exist "catatan\index.html" (
  start "" "catatan\index.html"
) else (
  start "" "index.html"
)

echo.
echo Selesai ✅
pause
exit /b 0

:ERR_NO_TOOL
echo ERROR: tools\build_posts.py tidak ditemukan.
echo Pastikan file build-and-open.bat ada di root (selevel index.html).
pause
exit /b 1

:ERR_NO_ARTIKEL
echo ERROR: folder "artikel" tidak ditemukan.
echo Pastikan struktur website benar.
pause
exit /b 1

:ERR_NO_PY
echo ERROR: Python tidak ditemukan.
echo Install Python dan centang "Add Python to PATH".
pause
exit /b 1

:ERR_BUILD
echo ERROR: Proses build gagal. Lihat pesan error di atas.
pause
exit /b 1
