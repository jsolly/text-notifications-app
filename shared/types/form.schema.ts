/********************************************************************
 * OPTIONS & CONSTANTS
 ********************************************************************/

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

export const COUNTRY_OPTIONS = {
	US: { code: "US", name: "United States" },
	CA: { code: "CA", name: "Canada" },
	GB: { code: "GB", name: "United Kingdom" },
	AU: { code: "AU", name: "Australia" },
} as const;

// New: Extract validation classes into a separate constant
const PHONE_VALIDATION_CLASSES = {
	valid: "!border-green-500 !ring-green-500 !border-green-500",
	invalid: "!border-red-300 !ring-red-500 !border-red-300",
	default: "",
} as const;

// Updated PHONE_FIELD_TYPE to use the extracted PHONE_VALIDATION_CLASSES
export const PHONE_FIELD_TYPE = {
	type: "phone",
	formLabel: "Phone number",
	required: true,
	countries: COUNTRY_OPTIONS,
	defaultCountry: "US",
	validation: {
		defaultPlaceholder: "(555) 123-4567",
		defaultMaxLength: 15,
		minLengthForBackspace: 4,
		validationClasses: PHONE_VALIDATION_CLASSES,
	},
} as const;

/********************************************************************
 * TYPES & INTERFACES
 ********************************************************************/

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

export type PhoneValidation = {
	defaultPlaceholder: string;
	defaultMaxLength: number;
	minLengthForBackspace: number;
	validationClasses: {
		valid: string;
		invalid: string;
		default: string;
	};
};

export interface PhoneField extends BaseField {
	type: "phone";
	countries: typeof COUNTRY_OPTIONS;
	defaultCountry: Country;
	validation: PhoneValidation;
}

// Union type for all field types
export type FormField = SelectField | CheckboxField | InputField | PhoneField;

// Schema type helper
export type FormSchema = Record<string, FormField>;

// Basic type exports
export type Language = keyof typeof LANGUAGE_OPTIONS;
export type Unit = keyof typeof UNIT_OPTIONS;
export type TimeFormat = keyof typeof TIME_FORMAT_OPTIONS;
export type NotificationTime = keyof typeof NOTIFICATION_TIME_OPTIONS;
export type Country = keyof typeof COUNTRY_OPTIONS;

/********************************************************************
 * FORM SCHEMAS & DERIVED TYPES
 ********************************************************************/

export const CONTACT_SCHEMA = {
	name: {
		type: "input" as const,
		required: false,
		formLabel: "Name (optional, defaults to 'User')",
		placeholder: "User",
	},
	phoneNumber: PHONE_FIELD_TYPE,
	cityId: {
		type: "input" as const,
		required: true,
		formLabel: "City",
		placeholder: "Philadelphia, PA",
	},
} as const;

export const PREFERENCES_SCHEMA = {
	preferredLanguage: {
		type: "select" as const,
		options: LANGUAGE_OPTIONS,
		formLabel: "Language",
		required: true,
	},
	unitPreference: {
		type: "select" as const,
		options: UNIT_OPTIONS,
		formLabel: "Measurement Units",
		required: true,
	},
	timeFormat: {
		type: "select" as const,
		options: TIME_FORMAT_OPTIONS,
		formLabel: "Time Format",
		required: true,
	},
} as const;

export const NOTIFICATION_SCHEMA = {
	dailyFullmoon: {
		type: "checkbox" as const,
		formLabel: "Daily Full Moon Updates",
		required: false,
	},
	dailyNasa: {
		type: "checkbox" as const,
		formLabel: "NASA Picture of the Day",
		required: false,
	},
	dailyWeatherOutfit: {
		type: "checkbox" as const,
		formLabel: "Weather & Outfit Suggestions",
		required: false,
	},
	dailyRecipe: {
		type: "checkbox" as const,
		formLabel: "Daily Recipe Ideas",
		required: false,
	},
	instantSunset: {
		type: "checkbox" as const,
		formLabel: "Sunset Alerts",
		required: false,
	},
	dailyNotificationTime: {
		type: "select" as const,
		options: NOTIFICATION_TIME_OPTIONS,
		formLabel: "Notification Time",
		required: true,
	},
} as const;

// Derive types from schemas
type SchemaToType<T> = {
	[K in keyof T]: T[K] extends { type: "input" }
		? string
		: T[K] extends { type: "phone" }
			? string
			: T[K] extends { type: "checkbox" }
				? boolean
				: T[K] extends { type: "select"; options: Record<infer O, Option> }
					? O
					: never;
};

export type ContactInfo = SchemaToType<typeof CONTACT_SCHEMA>;
export type UserPreferences = SchemaToType<typeof PREFERENCES_SCHEMA>;
export type NotificationPreferences = SchemaToType<typeof NOTIFICATION_SCHEMA>;

export interface SignupFormData {
	contactInfo: ContactInfo;
	preferences: UserPreferences;
	notifications: NotificationPreferences;
}

/********************************************************************
 * CITY TYPES
 ********************************************************************/

export interface City {
	city_id: string;
	city_name: string;
	state_code: string | null;
	state_name: string | null;
	country_code: string;
	country_name: string;
}

export interface CityOption {
	value: string;
	label: string;
}
