@echo off
setlocal
pushd "%~dp0..\frontend"
call npm.cmd run desktop:package
set BUILD_RESULT=%errorlevel%
popd
exit /b %BUILD_RESULT%
