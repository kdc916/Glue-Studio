# maxVFX Glue Studio v1.7.4 — Windows 설치 가이드

대상은 Windows 10/11, 64-bit (x64)입니다. 기존 HTML 기능을 인터넷 없이 데스크톱 앱으로 실행합니다.

## 설치 방법
1. [Windows Release 페이지](https://github.com/kdc916/Glue-Studio/releases/tag/windows-v1.7.4)에서 maxVFX-Glue-Studio-Setup-1.7.4-x64.exe를 다운로드합니다.
2. 설치 마법사에서 설치 위치를 지정합니다.
3. 바탕화면 또는 시작 메뉴의 maxVFX Glue Studio로 실행합니다.
4. 제거: Windows 설정 > 앱 > 설치된 앱 > maxVFX Glue Studio.

시작 메뉴, 바탕화면 바로가기 및 제거 프로그램을 지원하며, 실행에 별도의 Node.js·Python·인터넷 연결은 필요하지 않습니다.

## 사용
- Ctrl + N: 새 프로젝트
- Ctrl + O: 이미지 시퀀스
- 파일 > GIF 불러오기: 움직이는 GIF의 전체 프레임
- Ctrl + Shift + S: 프로젝트 (.glueproj) 저장
- PNG/TGA/GIF/ZIP 출력: Windows 파일 저장 창에서 저장 위치를 선택

Windows SmartScreen은 코드 서명 인증서가 없는 설치 프로그램에 '알 수 없는 게시자' 경고를 표시할 수 있습니다. 다운로드 출처가 위 GitHub 저장소인지, Actions SHA-256과 파일이 일치하는지 확인한 후 실행하세요.

## Windows에서 빌드
Node.js 22, Python 3.12 설치 후 다음 명령을 실행합니다.

    python desktop/generate_icon.py
    npm install --no-audit --no-fund
    npm run test:desktop
    npm test
    npm run dist:windows

생성 파일: dist/windows/maxVFX-Glue-Studio-Setup-1.7.4-x64.exe

자동 빌드: GitHub Actions > Windows Desktop Installer. 성공하면 Windows NSIS EXE를 Actions Artifact 및 위 Release에 게시합니다.

## 기술
- Electron 44.7.0 기반, Chromium 포함. 브라우저 설치 불필요
- 안전한 gluestudio://app/ 로컬 프로토콜, renderer Node 통합 비활성화, contextIsolation/sandbox
- 원본 웹 에디터 코드 유지, 새 앱 셸만 추가
- 로컬 IndexedDB 자동 복구 사용 가능(사용자가 활성화한 경우)
- 인증서 서명 없음. 실제 Windows GUI 실기 실행 검증은 별도 수행 필요
