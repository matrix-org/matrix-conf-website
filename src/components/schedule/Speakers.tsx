import type { Session } from "../../scripts/schedule";

/** Most avatars shown before the rest are summed up as "+N". */
const MAX_AVATARS = 4;

/**
 * A session's speakers as overlapping avatars, for those who have one, followed by their names.
 *
 * @param props.session Session to show the speakers of.
 */
export function Speakers({ session }: { session: Session }) {
    if (!session.speakers.length) return null;
    const faces = session.speakers.filter((speaker) => speaker.avatar);
    const names = session.speakers.map((speaker) => speaker.name).join(", ");
    return (
        <span class="who">
            {faces.length > 0 && (
                <span class="avatars">
                    {faces.slice(0, MAX_AVATARS).map((speaker) => (
                        <img
                            class="avatar"
                            src={speaker.avatar}
                            alt=""
                            width="24"
                            height="24"
                            loading="lazy"
                        />
                    ))}
                    {faces.length > MAX_AVATARS && (
                        <span class="avatar more">
                            +{faces.length - MAX_AVATARS}
                        </span>
                    )}
                </span>
            )}
            <span class="names">{names}</span>
        </span>
    );
}
