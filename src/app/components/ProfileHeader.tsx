// src/app/components/ProfileHeader.tsx

export default function ProfileHeader() {
  return (
    <div className="text-center space-y-3">
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight"
        data-testid="profile-heading"
      >
        Profile
      </h1>
    </div>
  );
}
