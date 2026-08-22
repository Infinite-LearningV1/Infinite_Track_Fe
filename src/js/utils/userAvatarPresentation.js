import { getInitials, getAvatarColor } from "./avatarUtils.js";
import { getUserPhotoUrl } from "./photoValidation.js";

export function createUserAvatarPresentation({
  fullName = "",
  photo = null,
} = {}) {
  const safeName = typeof fullName === "string" ? fullName : "";
  return {
    photoUrl: getUserPhotoUrl(photo, null),
    initials: getInitials(safeName),
    avatarColor: getAvatarColor(safeName),
  };
}
