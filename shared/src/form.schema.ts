/********************************************************************
 * OPTIONS & CONSTANTS
 ********************************************************************/

export const LANGUAGE_OPTIONS = {
	en: { code: "en", name: "English 🇺🇸" },
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
	morning: { code: "morning", name: "Morning (8:00) 🌞" },
	afternoon: { code: "afternoon", name: "Afternoon (14:00) 🌤️" },
	evening: { code: "evening", name: "Evening (20:00) 🌙" },
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
	preferred_name: {
		required: false,
		form_label: "Name (optional, defaults to 'User')",
		placeholder: "User",
	},
	phone_number: {
		form_label: "Phone number",
		required: true,
		countries: COUNTRY_OPTIONS,
		default_country: "US",
		validation: {
			default_placeholder: "(555) 123-4567",
			default_max_length: 15,
			min_length_for_backspace: 4,
			validation_classes: PHONE_VALIDATION_CLASSES,
		},
	},
	phone_country_code: {
		form_label: "Country Code",
		required: true,
		validation: {
			default_placeholder: "+1",
			default_max_length: 4,
		},
	},
	city_id: {
		required: true,
		form_label: "City",
		placeholder: "Philadelphia, PA",
	},
} as const;

export const PREFERENCES_SCHEMA = {
	preferred_language: {
		options: LANGUAGE_OPTIONS,
		form_label: "Language",
		required: true,
	},
	unit_preference: {
		options: UNIT_OPTIONS,
		form_label: "Measurement Units",
		required: true,
	},
	time_format: {
		options: TIME_FORMAT_OPTIONS,
		form_label: "Time Format",
		required: true,
	},
	daily_notification_time: {
		options: NOTIFICATION_TIME_OPTIONS,
		form_label: "Notification Time",
		required: true,
	},
} as const;

export const NOTIFICATION_SCHEMA = {
	daily_celestial_events: {
		form_label: "Celestial Events",
		required: false,
		metadata: {
			description:
				"Receive notifications about meteor showers, solar eclipses, and other things happening in the sky.",
			badge_type: "scheduled",
			image_url: "/assets/notifications/celestial.webp",
			category: "Nature & Sky Events",
		},
	},
	daily_nasa: {
		form_label: "NASA Astronomy Photo of the Day",
		required: false,
		metadata: {
			description:
				"Receive a daily notification with the NASA Astronomy Photo of the Day.",
			badge_type: "daily",
			image_url: "/assets/notifications/astrological.webp",
			category: "Nature & Sky Events",
		},
	},
	daily_weather_outfit: {
		form_label: "Weather & Outfit Suggestions",
		required: false,
		metadata: {
			description:
				"Receive a daily notification with weather notifications and outfit suggestions based on the forecast.",
			badge_type: "daily",
			image_url: "/assets/notifications/weather-example.jpg",
			category: "Daily Life",
		},
	},
	daily_recipe: {
		form_label: "Daily Recipe Ideas",
		required: false,
		metadata: {
			description:
				"Receive a daily notification with a recipe idea, tailored to your preferences.",
			badge_type: "daily",
			image_url: "/assets/notifications/recipe-example.jpg",
			category: "Daily Life",
		},
	},
	instant_sunset: {
		form_label: "Sunset Alerts",
		required: false,
		metadata: {
			description:
				"Receive a notification 30 minutes before sunset to capture the perfect photo or enjoy a peaceful moment.",
			badge_type: "instant",
			image_url: "/assets/notifications/sunset.jpg",
			category: "Nature & Sky Events",
		},
	},
} as const;

export type ContactInfo = keyof typeof CONTACT_SCHEMA;
export type Preferences = keyof typeof PREFERENCES_SCHEMA;
export type Notification = keyof typeof NOTIFICATION_SCHEMA;

export interface SignupFormData {
	contact_info: {
		[key in ContactInfo]: string;
	} & {
		phone_country_code: string;
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
