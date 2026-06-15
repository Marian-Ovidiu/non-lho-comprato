export type SupportedTimezone = {
  value: string;
  label: string;
  group: string;
};

export const SUPPORTED_TIMEZONES: SupportedTimezone[] = [
  { value: "UTC", label: "UTC", group: "Globale" },

  { value: "Atlantic/Azores", label: "Azzorre", group: "Europa" },
  { value: "Europe/Lisbon", label: "Lisbona, Funchal", group: "Europa" },
  { value: "Europe/London", label: "Londra, Dublino", group: "Europa" },
  { value: "Europe/Paris", label: "Parigi, Madrid, Amsterdam", group: "Europa" },
  { value: "Europe/Rome", label: "Roma, Berlino, Varsavia", group: "Europa" },
  { value: "Europe/Athens", label: "Atene, Bucarest, Helsinki", group: "Europa" },
  { value: "Europe/Moscow", label: "Mosca, San Pietroburgo", group: "Europa" },

  { value: "America/Los_Angeles", label: "Los Angeles, Vancouver", group: "Americhe" },
  { value: "America/Denver", label: "Denver", group: "Americhe" },
  { value: "America/Chicago", label: "Chicago, Città del Messico", group: "Americhe" },
  { value: "America/New_York", label: "New York, Toronto", group: "Americhe" },
  { value: "America/Sao_Paulo", label: "São Paulo, Buenos Aires", group: "Americhe" },

  { value: "Asia/Dubai", label: "Dubai, Abu Dhabi", group: "Asia/Pacifico" },
  { value: "Asia/Kolkata", label: "Mumbai, Nuova Delhi", group: "Asia/Pacifico" },
  { value: "Asia/Bangkok", label: "Bangkok, Giacarta", group: "Asia/Pacifico" },
  { value: "Asia/Singapore", label: "Singapore, Kuala Lumpur", group: "Asia/Pacifico" },
  { value: "Asia/Shanghai", label: "Pechino, Hong Kong, Taipei", group: "Asia/Pacifico" },
  { value: "Asia/Tokyo", label: "Tokyo, Seoul", group: "Asia/Pacifico" },
  { value: "Australia/Sydney", label: "Sydney, Melbourne", group: "Asia/Pacifico" },
  { value: "Pacific/Auckland", label: "Auckland", group: "Asia/Pacifico" },
];

export function isSupportedTimezone(value: string): boolean {
  return SUPPORTED_TIMEZONES.some((tz) => tz.value === value);
}
