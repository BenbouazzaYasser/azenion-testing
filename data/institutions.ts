export interface Institution {
  name: string;
  fullName?: string;
}

export const INSTITUTIONS: Institution[] = [
  { name: "ENSA", fullName: "École Nationale des Sciences Appliquées" },
  { name: "UM6P", fullName: "Université Mohammed VI Polytechnique" },
  { name: "UM5", fullName: "Université Mohammed V" },
  { name: "UIT", fullName: "Université Ibn Tofail" },
];
