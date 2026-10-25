/**
 * FUDMA E-Attendance System - QR & Attendance Engine
 * Course: GET 411 | Group 6 | Academic Session: 2026/2027
 */

class AttendanceEngine {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.activeQrCodeInstance = null;
    this.projectorTimerInterval = null;
  }

  // --- QR Code Generation ---
  generateSessionToken(session) {
    if (session.mobileQrUrl) return session.mobileQrUrl;
    const origin = window.location.origin || 'https://fudma-group6-e-attendance.vercel.app';
    const token = session.qrToken || session.qr_token || btoa(`${session.id}:${session.startTime}:${Date.now()}`).slice(0, 24);
    return `${origin}/#attendance?sessionId=${encodeURIComponent(session.id)}&token=${encodeURIComponent(token)}`;
  }

  renderQRCode(containerElement, session, size = 250) {
    if (!containerElement) return;
    containerElement.innerHTML = '';

    const payload = session.mobileQrUrl || this.generateSessionToken(session);

    if (typeof QRCode !== 'undefined') {
      try {
        this.activeQrCodeInstance = new QRCode(containerElement, {
          text: payload,
          width: size,
          height: size,
          colorDark: "#08245b",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (e) {
        console.error('Error generating QR code with QRCode.js:', e);
        this._renderFallbackQR(containerElement, payload, size);
      }
    } else {
      this._renderFallbackQR(containerElement, payload, size);
    }
  }

  _renderFallbackQR(containerElement, text, size) {
    // Fallback QR service via secure Google Charts or QR Server API
    const encoded = encodeURIComponent(text);
    const img = document.createElement('img');
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&color=08245b`;
    img.alt = 'FUDMA Lecture Attendance QR Code';
    img.style.maxWidth = '100%';
    img.style.borderRadius = '8px';
    containerElement.appendChild(img);
  }

  // --- Camera QR Code Scanning ---
  async startCameraScanner(elementId, onSuccessCallback, onErrorCallback) {
    if (typeof Html5Qrcode === 'undefined') {
      throw new Error('QR Scanner library (Html5Qrcode) is not loaded.');
    }

    if (this.isScanning) {
      await this.stopCameraScanner();
    }

    this.html5QrCode = new Html5Qrcode(elementId);
    this.isScanning = true;

    const qrConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    const qrSuccessHandler = (decodedText, decodedResult) => {
      this.handleScannedData(decodedText, onSuccessCallback, onErrorCallback);
    };

    try {
      // 1. Try environment (rear) camera
      await this.html5QrCode.start(
        { facingMode: "environment" },
        qrConfig,
        qrSuccessHandler,
        () => {}
      );
    } catch (envErr) {
      console.warn('Rear camera unavailable, attempting front/user camera or default:', envErr);
      try {
        // 2. Fallback to user (front/webcam) camera
        await this.html5QrCode.start(
          { facingMode: "user" },
          qrConfig,
          qrSuccessHandler,
          () => {}
        );
      } catch (userErr) {
        console.warn('Front camera unavailable, querying available devices:', userErr);
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            await this.html5QrCode.start(
              cameras[0].id,
              qrConfig,
              qrSuccessHandler,
              () => {}
            );
          } else {
            this.isScanning = false;
            throw new Error('No camera hardware detected on this device. You can use manual code or image upload.');
          }
        } catch (finalErr) {
          this.isScanning = false;
          throw finalErr;
        }
      }
    }
  }

  async scanImageFile(file, onSuccess, onError) {
    if (!file) return;
    try {
      if (!this.html5QrCode) {
        this.html5QrCode = new Html5Qrcode('scanner-viewfinder');
      }
      const decodedText = await this.html5QrCode.scanFile(file, true);
      await this.handleScannedData(decodedText, onSuccess, onError);
    } catch (err) {
      if (onError) onError(new Error('Could not detect a valid QR code in the uploaded image. Please ensure the QR code is clear and in focus.'));
    }
  }

  async stopCameraScanner() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      this.isScanning = false;
    }
  }

  async handleScannedData(decodedText, onSuccess, onError) {
    // Prevent multiple rapid fires
    if (!this.isScanning) return;
    this.isScanning = false; // pause to process

    try {
      let targetSessionId = null;
      let qrToken = null;

      // Parse full URL or URL with hash
      if (decodedText.includes('sessionId=')) {
        try {
          const urlStr = decodedText.startsWith('http') ? decodedText : `https://dummy.com/${decodedText}`;
          const urlObj = new URL(urlStr);
          let searchParams = urlObj.searchParams;
          if (urlObj.hash && urlObj.hash.includes('?')) {
            const hashQuery = urlObj.hash.split('?')[1];
            searchParams = new URLSearchParams(hashQuery);
          }
          targetSessionId = searchParams.get('sessionId');
          qrToken = searchParams.get('token');
        } catch (e) {
          const matchId = decodedText.match(/sessionId=([^&]+)/);
          const matchToken = decodedText.match(/token=([^&]+)/);
          if (matchId) targetSessionId = decodeURIComponent(matchId[1]);
          if (matchToken) qrToken = decodeURIComponent(matchToken[1]);
        }
      } else if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        // Parse JSON structure if formatted
        const parsed = JSON.parse(decodedText);
        targetSessionId = parsed.sessionId;
        qrToken = parsed.token || parsed.signature;
      } else if (decodedText.includes('session_')) {
        // Plain text session id or custom string
        const match = decodedText.match(/(session_[a-zA-Z0-9_]+)/);
        if (match) targetSessionId = match[1];
        else targetSessionId = decodedText.trim();
      } else {
        targetSessionId = decodedText.trim();
      }

      if (!targetSessionId) {
        throw new Error('Scanned QR code is not a valid FUDMA lecture attendance token.');
      }

      // Stop scanner upon reading
      await this.stopCameraScanner();

      // Submit attendance record
      const student = window.authService.currentUser;
      if (!student) {
        throw new Error('Please sign in as a student before scanning.');
      }

      // Check for Bearer token for serverless API verification
      const accessToken = window.authService.getAccessToken();
      let result;

      if (accessToken) {
        const resp = await fetch('/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            sessionId: targetSessionId,
            qrToken: qrToken,
            verificationMethod: 'qr_scan'
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Attendance submission rejected.');
        }
        result = data.attendance || data;
      } else {
        result = await window.dbService.recordAttendanceSubmission({
          sessionId: targetSessionId,
          studentUid: student.uid,
          verificationMethod: 'qr_scan',
          qrToken: qrToken
        });
      }

      if (onSuccess) onSuccess(result);
    } catch (err) {
      if (onError) onError(err);
      // Resume scanner if error so student can try again
      setTimeout(() => {
        if (!this.isScanning && this.html5QrCode) {
          this.isScanning = true;
        }
      }, 2000);
    }
  }

  // --- Manual Code Fallback ---
  async submitManualCode(code, onSuccess, onError) {
    try {
      const cleanCode = (code || '').trim().toUpperCase();
      if (!cleanCode) throw new Error('Please enter the 6-character lecture code.');

      const student = window.authService.currentUser;
      if (!student) throw new Error('Please sign in as a student.');

      // Find active or paused session matching manual code
      const allSessions = await window.dbService.getSessions();
      const targetSession = allSessions.find(s => 
        (s.status === 'active' || s.status === 'paused') && 
        s.manualCode && 
        s.manualCode.trim().toUpperCase() === cleanCode
      );

      if (!targetSession) {
        throw new Error(`Invalid or expired lecture code "${cleanCode}". No active lecture session matches this code.`);
      }

      const accessToken = window.authService.getAccessToken();
      let result;

      if (accessToken) {
        const resp = await fetch('/api/attendance/record', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            sessionId: targetSession.id,
            manualCode: cleanCode,
            verificationMethod: 'manual_code'
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Attendance submission rejected.');
        }
        result = data.attendance || data;
      } else {
        result = await window.dbService.recordAttendanceSubmission({
          sessionId: targetSession.id,
          studentUid: student.uid,
          verificationMethod: 'manual_code',
          manualCode: cleanCode
        });
      }

      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      if (onError) onError(err);
      throw err;
    }
  }

  // --- Projector Countdown Timer ---
  startProjectorTimer(session, timeRemainingElement) {
    if (this.projectorTimerInterval) {
      clearInterval(this.projectorTimerInterval);
    }

    const updateTimer = () => {
      const now = new Date();
      const [closeHours, closeMinutes] = (session.closeTime || "23:59").split(':').map(Number);
      
      const target = new Date();
      target.setHours(closeHours, closeMinutes, 0, 0);

      const diffMs = target - now;
      if (diffMs <= 0) {
        timeRemainingElement.innerText = "SESSION CLOSED";
        timeRemainingElement.style.color = "var(--danger-solid)";
        clearInterval(this.projectorTimerInterval);
        return;
      }

      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      timeRemainingElement.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    updateTimer();
    this.projectorTimerInterval = setInterval(updateTimer, 1000);
  }

  stopProjectorTimer() {
    if (this.projectorTimerInterval) {
      clearInterval(this.projectorTimerInterval);
      this.projectorTimerInterval = null;
    }
  }
}

const attendanceEngine = new AttendanceEngine();
window.attendanceEngine = attendanceEngine;
