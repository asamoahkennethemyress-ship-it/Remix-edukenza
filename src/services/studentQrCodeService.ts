/**
 * Student Unique QR Code Service
 * Facilitates student identification, Canteen POS checkout, and Transport module boarding.
 */

export interface StudentQrPayload {
  version: number;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  walletId: string;
  nfcCardId?: string;
  transportPassCode: string;
  canteenPassCode: string;
  issuedAt: string;
  signature: string;
}

/**
 * Generate a unique QR code payload string for a student
 */
export function generateStudentQrPayload(params: {
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  walletId: string;
  nfcCardId?: string;
}): string {
  const issuedAt = new Date().toISOString();
  // Simple deterministic verification hash signature
  const rawSigStr = `${params.schoolId}:${params.studentId}:${params.walletId}:${issuedAt}`;
  let hash = 0;
  for (let i = 0; i < rawSigStr.length; i++) {
    hash = (hash << 5) - hash + rawSigStr.charCodeAt(i);
    hash |= 0;
  }
  const signature = `SIG-${Math.abs(hash).toString(36).toUpperCase()}`;

  const payload: StudentQrPayload = {
    version: 1,
    schoolId: params.schoolId,
    studentId: params.studentId,
    studentName: params.studentName,
    className: params.className,
    walletId: params.walletId,
    nfcCardId: params.nfcCardId || `NFC-${params.studentId}`,
    transportPassCode: `BUS-${params.schoolId.substring(0, 4)}-${params.studentId}`,
    canteenPassCode: `MEAL-${params.schoolId.substring(0, 4)}-${params.studentId}`,
    issuedAt,
    signature
  };

  return JSON.stringify(payload);
}

/**
 * Parse and validate a student QR code payload (from camera scan or string input)
 */
export function parseStudentQrPayload(rawQrData: string): {
  isValid: boolean;
  payload?: StudentQrPayload;
  errorMessage?: string;
} {
  if (!rawQrData || typeof rawQrData !== 'string') {
    return { isValid: false, errorMessage: 'Invalid or empty QR code data' };
  }

  try {
    // Check if JSON payload format
    if (rawQrData.trim().startsWith('{')) {
      const parsed = JSON.parse(rawQrData) as StudentQrPayload;
      if (parsed.studentId && parsed.walletId && parsed.schoolId) {
        return { isValid: true, payload: parsed };
      }
    }

    // Fallback legacy code format e.g. "EDUK-CARD-std_01-WAL-EDUK-9921"
    const parts = rawQrData.split('-');
    if (parts.length >= 3) {
      const studentId = parts[2] || 'student_unknown';
      const walletId = parts[3] ? `WAL-${parts[3]}` : 'WAL-DEFAULT';
      return {
        isValid: true,
        payload: {
          version: 1,
          schoolId: 'school_default',
          studentId,
          studentName: 'Verified Student',
          className: 'Active Class',
          walletId,
          transportPassCode: `BUS-${studentId}`,
          canteenPassCode: `MEAL-${studentId}`,
          issuedAt: new Date().toISOString(),
          signature: 'LEGACY-VALID'
        }
      };
    }

    return { isValid: false, errorMessage: 'Unrecognized student QR code structure' };
  } catch (err) {
    return { isValid: false, errorMessage: 'Corrupted QR code format' };
  }
}

/**
 * Utility to generate SVG QR code path data matrix (21x21 QR Version 1 layout placeholder)
 */
export function generateQrSvgPaths(inputStr: string): string[] {
  // Simple algorithmic pseudo-random QR grid generation based on string hash
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    hash = (hash << 5) - hash + inputStr.charCodeAt(i);
    hash |= 0;
  }

  const paths: string[] = [];
  const size = 21;
  const cellSize = 10;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Finder patterns corners
      const isTopLeft = r < 7 && c < 7;
      const isTopRight = r < 7 && c >= size - 7;
      const isBottomLeft = r >= size - 7 && c < 7;

      if (isTopLeft || isTopRight || isBottomLeft) {
        const isOuterBorder =
          (r === 0 || r === 6 || c === 0 || c === 6 || r === size - 1 || r === size - 7 || c === size - 1 || c === size - 7) &&
          !((r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
            (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
            (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4));
        const isCenterSquare =
          (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
          (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
          (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);

        if (isOuterBorder || isCenterSquare) {
          paths.push(`M${c * cellSize},${r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`);
        }
      } else {
        // Data bits based on hash & cell coords
        const val = Math.abs(hash ^ (r * 31 + c * 17) ^ (r * c));
        if (val % 3 !== 0) {
          paths.push(`M${c * cellSize},${r * cellSize}h${cellSize}v${cellSize}h-${cellSize}z`);
        }
      }
    }
  }

  return paths;
}
