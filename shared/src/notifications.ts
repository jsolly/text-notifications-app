export type BadgeType = "scheduled" | "daily" | "instant";

export interface NotificationMetadata {
	description: string;
	badge_type: BadgeType;
	image_url: string;
	category: string;
}

export interface NotificationSchemaEntry {
	form_label: string;
	required: boolean;
	metadata: NotificationMetadata;
}

export interface NotificationWithMetadata {
	id: string;
	formLabel: string;
	required: boolean;
	metadata: {
		description: string;
		badgeType: BadgeType;
		imageUrl: string;
		category: string;
	};
}

export interface CategoryDescription {
	title: string;
	description: string;
}

export const CATEGORY_DESCRIPTIONS: Record<string, CategoryDescription> = {
	"Daily Life": {
		title: "Weather Alerts",
		description: "Get daily weather notifications and forecasts for your area.",
	},
};

export function groupNotificationsByCategory(
	notificationSchema: Record<string, NotificationSchemaEntry>,
) {
	return Object.entries(notificationSchema).reduce(
		(acc, [key, value]) => {
			const category = value.metadata.category;
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push({
				id: key,
				formLabel: value.form_label,
				required: value.required,
				metadata: {
					...value.metadata,
					badgeType: value.metadata.badge_type,
					imageUrl: value.metadata.image_url,
				},
			});
			return acc;
		},
		{} as Record<string, NotificationWithMetadata[]>,
	);
}

export function getNotificationCategories(
	notificationSchema: Record<string, NotificationSchemaEntry>,
) {
	return Object.keys(groupNotificationsByCategory(notificationSchema));
}
