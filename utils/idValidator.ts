// utils/idValidator.ts

export interface IDValidationResult {
  isValid: boolean;
  message?: string;
  formattedNumber?: string;
}

// Complete Philippine ID Validation - No AI needed, just regex patterns
export const validatePhilippineID = (
  idType: string,
  idNumber: string,
): IDValidationResult => {
  const cleanId = idNumber.trim().toUpperCase().replace(/\s/g, "");

  const validationRules: Record<
    string,
    { regex: RegExp; format: string; example: string }
  > = {
    philippine_passport: {
      regex: /^[A-Z]{1,2}\d{7}$/,
      format: "1-2 letters followed by 7 digits",
      example: "EB1234567 or P1234567",
    },
    philsys_national_id: {
      regex: /^\d{4}-\d{4}-\d{4}$|^\d{12}$/,
      format: "12 digits (with or without hyphens)",
      example: "1234-5678-9012 or 123456789012",
    },
    driver_license: {
      regex: /^[A-Z]{1,2}\d{2}-\d{2}-\d{6,8}$|^[A-Z]{1,2}\d{10,12}$/,
      format: "Letters + numbers with hyphens",
      example: "D12-34-567890 or D1234567890",
    },
    umid_id: {
      regex: /^\d{12,14}$/,
      format: "12-14 digits",
      example: "123456789012",
    },
    prc_id: {
      regex: /^\d{7}$/,
      format: "7 digits",
      example: "1234567",
    },
    postal_id: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "PH12345678",
    },
    voter_id: {
      regex: /^\d{7,12}$/,
      format: "7-12 digits",
      example: "1234567890",
    },
    sss_id: {
      regex: /^\d{2}-\d{7}-\d{1}$|^\d{10}$/,
      format: "10 digits (with or without hyphens)",
      example: "12-3456789-0 or 1234567890",
    },
    gsis_ecard: {
      regex: /^\d{10,12}$/,
      format: "10-12 digits",
      example: "1234567890",
    },
    philhealth_id: {
      regex: /^\d{2}-\d{9}-\d{1}$|^\d{12}$/,
      format: "12 digits (with or without hyphens)",
      example: "12-345678901-2 or 123456789012",
    },
    pagibig_loyalty_card: {
      regex: /^\d{12}$/,
      format: "12 digits",
      example: "123456789012",
    },
    nbi_clearance: {
      regex: /^[A-Z0-9]{8,12}$/i,
      format: "8-12 alphanumeric characters",
      example: "NBI12345678",
    },
    police_clearance: {
      regex: /^\d{8,12}$/,
      format: "8-12 digits",
      example: "12345678",
    },
    tin_id: {
      regex: /^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9,12}$/,
      format: "9-12 digits (with or without hyphens)",
      example: "123-456-789-123 or 123456789",
    },
    senior_citizen_id: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "SC12345678",
    },
    pwd_id: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "PWD12345678",
    },
    ofw_id: {
      regex: /^[A-Z0-9]{10,15}$/i,
      format: "10-15 alphanumeric characters",
      example: "OFW123456789",
    },
    owwa_id: {
      regex: /^[A-Z0-9]{10,15}$/i,
      format: "10-15 alphanumeric characters",
      example: "OWWA123456789",
    },
    seamans_book: {
      regex: /^[A-Z0-9]{8,12}$/i,
      format: "8-12 alphanumeric characters",
      example: "SB12345678",
    },
    ibp_id: {
      regex: /^\d{6,10}$/,
      format: "6-10 digits",
      example: "123456",
    },
    barangay_id: {
      regex: /^[A-Z0-9]{6,12}$/i,
      format: "6-12 alphanumeric characters",
      example: "BG123456",
    },
    company_id: {
      regex: /^[A-Z0-9]{5,15}$/i,
      format: "5-15 alphanumeric characters",
      example: "COMP12345",
    },
    school_id: {
      regex: /^[A-Z0-9]{5,15}$/i,
      format: "5-15 alphanumeric characters",
      example: "SCH12345",
    },
    firearms_license: {
      regex: /^\d{10,12}$/,
      format: "10-12 digits",
      example: "1234567890",
    },
    solo_parent_id: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "SP12345678",
    },
    "4ps_id": {
      regex: /^\d{10,12}$/,
      format: "10-12 digits",
      example: "1234567890",
    },
    student_permit: {
      regex: /^[A-Z]{1,2}\d{8,10}$/,
      format: "1-2 letters followed by 8-10 digits",
      example: "SP12345678",
    },
    integrated_bar_id: {
      regex: /^\d{6,10}$/,
      format: "6-10 digits",
      example: "123456",
    },
    comelec_id: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "COM12345678",
    },
    health_card: {
      regex: /^[A-Z0-9]{8,15}$/i,
      format: "8-15 alphanumeric characters",
      example: "HC12345678",
    },
    library_card: {
      regex: /^[A-Z0-9]{6,12}$/i,
      format: "6-12 alphanumeric characters",
      example: "LIB123456",
    },
    post_office_id: {
      regex: /^[A-Z0-9]{6,12}$/i,
      format: "6-12 alphanumeric characters",
      example: "PO123456",
    },
  };

  const rule = validationRules[idType];
  if (!rule) {
    return { isValid: false, message: "Invalid ID type selected" };
  }

  if (!rule.regex.test(cleanId)) {
    return {
      isValid: false,
      message: `Invalid ${idType.replace(/_/g, " ").toUpperCase()} format. Should be: ${rule.format}. Example: ${rule.example}`,
    };
  }

  return { isValid: true, formattedNumber: cleanId };
};

// Auto-detect ID type from number (bonus feature)
export const detectIDType = (idNumber: string): string | null => {
  const cleanId = idNumber.trim().toUpperCase().replace(/\s/g, "");

  const detectionRules: Array<{
    type: string;
    regex: RegExp;
    priority: number;
  }> = [
    {
      type: "philsys_national_id",
      regex: /^\d{4}-\d{4}-\d{4}$|^\d{12}$/,
      priority: 1,
    },
    { type: "prc_id", regex: /^\d{7}$/, priority: 2 },
    { type: "sss_id", regex: /^\d{2}-\d{7}-\d{1}$|^\d{10}$/, priority: 2 },
    {
      type: "philhealth_id",
      regex: /^\d{2}-\d{9}-\d{1}$|^\d{12}$/,
      priority: 2,
    },
    { type: "pagibig_loyalty_card", regex: /^\d{12}$/, priority: 2 },
    { type: "umid_id", regex: /^\d{12,14}$/, priority: 2 },
    {
      type: "tin_id",
      regex: /^\d{3}-\d{3}-\d{3}-\d{3}$|^\d{9,12}$/,
      priority: 2,
    },
    { type: "philippine_passport", regex: /^[A-Z]{1,2}\d{7}$/, priority: 1 },
    {
      type: "driver_license",
      regex: /^[A-Z]{1,2}\d{2}-\d{2}-\d{6,8}$|^[A-Z]{1,2}\d{10,12}$/,
      priority: 1,
    },
    { type: "voter_id", regex: /^\d{7,12}$/, priority: 3 },
    { type: "police_clearance", regex: /^\d{8,12}$/, priority: 3 },
    { type: "nbi_clearance", regex: /^[A-Z0-9]{8,12}$/i, priority: 3 },
  ];

  // Sort by priority (lower number = higher priority)
  const sortedRules = detectionRules.sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (rule.regex.test(cleanId)) {
      return rule.type;
    }
  }

  return null;
};
