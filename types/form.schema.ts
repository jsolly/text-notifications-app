// ============================================================================
// CONSTANTS
// ============================================================================

export const LANGUAGE_OPTIONS = {
	en: { code: "en", name: "English" },
	es: { code: "es", name: "Español" },
	fr: { code: "fr", name: "Français" },
} as const;

export const UNIT_OPTIONS = {
	metric: { code: "metric", name: "Metric (°C, meters, liters)" },
	imperial: { code: "imperial", name: "Imperial (°F, miles, gallons)" },
} as const;

export const TIME_FORMAT_OPTIONS = {
	"24h": { code: "24h", name: "24h (eg. 23:00)" },
	"12h": { code: "12h", name: "12h (eg. 11:00 PM)" },
} as const;

export const NOTIFICATION_TIME_OPTIONS = {
	morning: { code: "morning", name: "Morning (8:00)" },
	afternoon: { code: "afternoon", name: "Afternoon (14:00)" },
	evening: { code: "evening", name: "Evening (20:00)" },
} as const;

export const IMPERIAL_COUNTRIES = ["US", "MM", "LR"] as const;

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Option {
	code: string;
	name: string;
}

// Base field interface
export interface BaseField {
	formLabel: string;
	required?: boolean;
}

// Specific field types
export interface SelectField extends BaseField {
	type: "select";
	options: Record<string, Option>;
}

export interface CheckboxField extends BaseField {
	type: "checkbox";
}

export interface InputField extends BaseField {
	type: "input";
	placeholder?: string;
}

// Union type for all field types
export type FormField = SelectField | CheckboxField | InputField;

// Schema type helpers
export type FormSchema = Record<string, FormField>;

// Type exports
export type Language = keyof typeof LANGUAGE_OPTIONS;
export type Unit = keyof typeof UNIT_OPTIONS;
export type TimeFormat = keyof typeof TIME_FORMAT_OPTIONS;
export type NotificationTime = keyof typeof NOTIFICATION_TIME_OPTIONS;

export interface ContactInfo {
	name: string;
	phoneNumber: string;
	cityId: string;
}

export interface UserPreferences {
	preferredLanguage: Language;
	unitPreference: Unit;
	timeFormat: TimeFormat;
	notificationTimezone: string;
}

export interface NotificationPreferences {
	dailyFullmoon: boolean;
	dailyNasa: boolean;
	dailyWeatherOutfit: boolean;
	dailyRecipe: boolean;
	instantSunset: boolean;
	dailyNotificationTime: string;
}

export interface SignupFormData {
	contactInfo: ContactInfo;
	preferences: UserPreferences;
	notifications: NotificationPreferences;
}

// Add these interfaces after the existing interfaces
export interface City {
	city_id: number;
	city_name: string;
	state_code: string | null;
	state_name: string | null;
	country_code: string;
	country_name: string;
}

export interface CityOption {
	value: number;
	label: string;
}

// ============================================================================
// FORM SCHEMAS
// ============================================================================

// Contact Information Schema
export const CONTACT_SCHEMA: FormSchema = {
	name: {
		type: "input",
		required: true,
		formLabel: "Name",
		placeholder: "John Doe",
	},
	phoneNumber: {
		type: "input",
		required: true,
		formLabel: "Phone Number",
		placeholder: "+1234567890",
	},
	cityId: {
		type: "input",
		required: true,
		formLabel: "City",
		placeholder: "Philadelphia, PA",
	},
};

// User Preferences Schema
export const PREFERENCES_SCHEMA: FormSchema = {
	preferredLanguage: {
		type: "select",
		options: LANGUAGE_OPTIONS,
		formLabel: "Language",
	},
	unitPreference: {
		type: "select",
		options: UNIT_OPTIONS,
		formLabel: "Measurement Units",
	},
	timeFormat: {
		type: "select",
		options: TIME_FORMAT_OPTIONS,
		formLabel: "Time Format",
	},
	notificationTime: {
		type: "select",
		options: NOTIFICATION_TIME_OPTIONS,
		formLabel: "Notification Time",
	},
};

// Notification Preferences Schema
export const NOTIFICATION_SCHEMA: FormSchema = {
	dailyFullmoon: {
		type: "checkbox",
		formLabel: "Daily Full Moon Updates",
	},
	dailyNasa: {
		type: "checkbox",
		formLabel: "NASA Picture of the Day",
	},
	dailyWeatherOutfit: {
		type: "checkbox",
		formLabel: "Weather & Outfit Suggestions",
	},
	dailyRecipe: {
		type: "checkbox",
		formLabel: "Daily Recipe Ideas",
	},
	instantSunset: {
		type: "checkbox",
		formLabel: "Sunset Alerts",
	},
};
