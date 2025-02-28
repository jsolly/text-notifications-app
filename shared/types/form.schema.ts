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
} as const;

// New: Extract validation classes into a separate constant
const PHONE_VALIDATION_CLASSES = {
	valid: "!border-green-500 !ring-green-500 !border-green-500",
	invalid: "!border-red-300 !ring-red-500 !border-red-300",
	default: "",
} as const;

/********************************************************************
 * TYPES & INTERFACES
 ********************************************************************/

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
		required: false,
		formLabel: "Name (optional, defaults to 'User')",
		placeholder: "User",
	},
	phoneNumber: {
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
	},
	cityId: {
		required: true,
		formLabel: "City",
		placeholder: "Philadelphia, PA",
	},
} as const;

export const PREFERENCES_SCHEMA = {
	preferredLanguage: {
		options: LANGUAGE_OPTIONS,
		formLabel: "Language",
		required: true,
	},
	unitPreference: {
		options: UNIT_OPTIONS,
		formLabel: "Measurement Units",
		required: true,
	},
	timeFormat: {
		options: TIME_FORMAT_OPTIONS,
		formLabel: "Time Format",
		required: true,
	},
	dailyNotificationTime: {
		options: NOTIFICATION_TIME_OPTIONS,
		formLabel: "Notification Time",
		required: true,
	},
} as const;

export const NOTIFICATION_SCHEMA = {
	dailyFullmoon: {
		formLabel: "Daily Full Moon Updates",
		required: false,
	},
	dailyNasa: {
		formLabel: "NASA Picture of the Day",
		required: false,
	},
	dailyWeatherOutfit: {
		formLabel: "Weather & Outfit Suggestions",
		required: false,
	},
	dailyRecipe: {
		formLabel: "Daily Recipe Ideas",
		required: false,
	},
	instantSunset: {
		formLabel: "Sunset Alerts",
		required: false,
	},
} as const;

type Notification = keyof typeof NOTIFICATION_SCHEMA;
type ContactInfo = keyof typeof CONTACT_SCHEMA;
type Preferences = keyof typeof PREFERENCES_SCHEMA;

export interface SignupFormData {
	contactInfo: {
		[key in ContactInfo]: string;
	} & {
		phoneCountryCode: string;
	};
	preferences: {
		[key in Preferences]: string;
	};
	notifications: {
		[key in Notification]: boolean;
	};
}

/********************************************************************
 * CITY TYPES
 ********************************************************************/

export interface City {
	id: string;
	name: string;
	state_id: string;
	state_code: string | null;
	country_id: string;
	country_code: string;
	latitude: number;
	longitude: number;
	timezone: string;
	wikidata_id: string;
	created_at: string;
	updated_at: string;
	active: boolean;
}

export interface CityOption {
	value: string;
	label: string;
}
