import test from "node:test";
import assert from "node:assert/strict";
import { getAvatarColor } from "../src/js/utils/avatarUtils.js";
import { createUserAvatarPresentation } from "../src/js/utils/userAvatarPresentation.js";

test("builds photo-first presentation without a fabricated fallback", () => {
  assert.deepEqual(
    createUserAvatarPresentation({
      fullName: "Ayu Lestari",
      photo: "https://cdn.example.com/ayu.jpg",
    }),
    {
      photoUrl: "https://cdn.example.com/ayu.jpg",
      initials: "AL",
      avatarColor: getAvatarColor("Ayu Lestari"),
    },
  );
});

test("normalizes a relative upload photo path", () => {
  assert.equal(
    createUserAvatarPresentation({
      fullName: "Ayu Lestari",
      photo: "uploads/users/7/profile/a.jpg",
    }).photoUrl,
    "./uploads/users/7/profile/a.jpg",
  );
});

test("missing employee photo resolves to null instead of owner.jpg", () => {
  const avatar = createUserAvatarPresentation({
    fullName: "Ayu Lestari",
    photo: null,
  });
  assert.equal(avatar.photoUrl, null);
  assert.notEqual(avatar.photoUrl, "./images/user/owner.jpg");
});

test("empty and source-asset photo paths resolve to null", () => {
  assert.equal(
    createUserAvatarPresentation({ fullName: "Ayu Lestari", photo: "" })
      .photoUrl,
    null,
  );
  assert.equal(
    createUserAvatarPresentation({
      fullName: "Ayu Lestari",
      photo: "/src/images/user/default-avatar.jpg",
    }).photoUrl,
    null,
  );
});
