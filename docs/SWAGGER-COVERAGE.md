# Swagger Coverage Matrix

Source snapshot: `data/docs.json` (OpenAPI 3.0.0).

Total documented operations: **133** across **109 paths**.

## Classification

- **safe_read**: 38
- **user_write**: 58
- **destructive**: 15
- **operator_admin**: 21
- **test_utility**: 1

## Complete operation catalog

| Class | Method | Path | Tags | Summary |
|---|---|---|---|---|
| user_write | POST | `/phone-waitinglist` | Waitlist, Mobile | Add phone in waitinglist |
| safe_read | GET | `/phone-waitinglist` | Waitlist | Get phones in waitinglist |
| user_write | POST | `/waitlist/smsCode` | Waitlist | Send SMS code to a phone number in the waitlist |
| safe_read | GET | `/waitlist/sent` | Waitlist | Get sent waitlist entries |
| operator_admin | GET | `/spotify/token` | Spotify | Get Spotify access token |
| safe_read | GET | `/me` | Profile | Get current profile data |
| user_write | POST | `/me` | Profile, Mobile | Add profile data, you can pass the schema payload and fill the user with required fields |
| user_write | POST | `/me/stats` | Profile | Get stats |
| safe_read | GET | `/me/firstTimes` | Profile | Get one time action states |
| user_write | POST | `/me/firstTimes` | Profile | Get one time action states |
| user_write | POST | `/sendWelcomeEmail` | Profile | Send a welcome email to the user |
| user_write | POST | `/sendVerificationEmail` | Profile | Send a verification email to the user |
| user_write | POST | `/sendVenueRequirementsEmail` | Profile | Send venue requirements email to the user |
| user_write | POST | `/block` | Profile | Block user with userId |
| user_write | POST | `/unblock` | Profile | Unblock user with userId |
| user_write | POST | `/ban` | Profile | Ban user with userId |
| user_write | POST | `/unban` | Profile | Remove ban from user with userId |
| safe_read | GET | `/bannedUsers` | Profile | Get all banned users |
| operator_admin | POST | `/tokens` | Spotify | Save spotify tokens |
| user_write | POST | `/checkDjName` | Profile | Check if DJ name is already taken |
| safe_read | GET | `/venueRequest` | Profile | get venue requests |
| user_write | POST | `/venueRequest` | Profile | Create venue requests |
| user_write | POST | `/request` | Profile | Create new requests |
| safe_read | GET | `/djs` | Profile | Get all djs |
| user_write | POST | `/profileImage` | Profile, Mobile | Save profile image |
| user_write | POST | `/groupChats` | Profile, Mobile | Save group chat image |
| user_write | POST | `/reports` | Profile | Report user |
| safe_read | GET | `/reports` | Profile | Get reports |
| safe_read | GET | `/my-blocked-users` | Profile | Get my blocked users |
| safe_read | GET | `/who-blocked-me` | Profile | Get users who blocked me |
| user_write | POST | `/requestAction` | Profile | Approve or Deny requests |
| safe_read | GET | `/moderation` | Profile | Get count of flaged content |
| safe_read | GET | `/leaderboard` | Profile, Mobile | Get leaderboard |
| user_write | POST | `/underage-emails` | Profile | Add Underage email |
| safe_read | GET | `/underage-emails` | Profile | Get underage emails |
| user_write | POST | `/underage-emails/remove` | Profile | Remove underage emails. |
| user_write | POST | `/check-if-email-exists` | Profile | Check email unique |
| user_write | POST | `/user/handle` | Profile, Mobile | Add user handle |
| user_write | POST | `/user/handle/check` | Profile, Mobile | Check user handle |
| safe_read | GET | `/users` | Profile, Mobile | Get user info |
| user_write | POST | `/user/migrate` | Profile | Migrate SMS user to normal user |
| user_write | PUT | `/profile/{userId}/updateLivePushTokenForEvent/{eventId}` | Profile | Update Live Activity Push Token for a user |
| destructive | DELETE | `/playlists/{playlistId}/musics/clear` | Playlists | Delete all musics in playlist |
| destructive | DELETE | `/playlists/{playlistId}/musics/{playlistIdInSongObject}` | Playlists | Delete playlist in playlist |
| destructive | DELETE | `/playlists/clear` | Playlists | Delete all playlists |
| destructive | DELETE | `/playlists/{playlistId}/musics/clear/{musicId}` | Playlists | Delete music in playlist |
| operator_admin | POST | `/playlists` | Playlists | Add new playlist |
| operator_admin | GET | `/playlists` | Playlists | Get all playlists |
| destructive | DELETE | `/playlists/{playlistId}` | Playlists | Delete playlist with id |
| operator_admin | PUT | `/playlists/{playlistId}` | Playlists | Edit playlist with id |
| operator_admin | POST | `/playlists/{playlistId}/musics` | Playlists | Add new musics to playlist |
| operator_admin | GET | `/playlists/{playlistId}/musics` | Playlists | Get all musics from playlist |
| operator_admin | POST | `/playlists/{playlistId}/musics/reorder` | Playlists | Reorder musics into the playlist |
| operator_admin | POST | `/playlists/reorder` | Playlists | Reorder playlists |
| safe_read | GET | `/plans` | Plans | Get all plans |
| user_write | POST | `/plans` | Plans | Add new plan |
| safe_read | GET | `/plans/{planId}` | Plans | Get plan by id |
| user_write | PUT | `/plans/{planId}` | Plans | Update plan |
| destructive | DELETE | `/plans/{planId}` | Plans | Delete plan by id |
| safe_read | GET | `/plans/{planId}/rsvps` | Plans | Get rsvps for a plan |
| user_write | POST | `/plans/{planId}/rsvps` | Plans | RSVP to a plan |
| user_write | POST | `/contact-us` | Miscellaneous | Contact Us form submission |
| user_write | POST | `/subscribe-to-email-list` | Miscellaneous, Mobile | Subscribe to email list |
| safe_read | GET | `/unsubscribe-from-email-list` | Miscellaneous | Unsubscribe from email list |
| safe_read | GET | `/get-email-list` | Miscellaneous | Get email list |
| safe_read | GET | `/user-invite-code` | Miscellaneous, Mobile | Get user invite code |
| test_utility | GET | `/tests/token` | Miscellaneous, Mobile | Get test firebase id token |
| operator_admin | GET | `/invite-code` | Invite Code | Get all invite codes |
| operator_admin | POST | `/invite-code` | Invite Code | Generate invite code |
| destructive | DELETE | `/invite-code/{key}` | Invite Code | Delete invite code |
| destructive | DELETE | `/home/announcement` | Home | Remove Announcement |
| safe_read | GET | `/home/announcement` | Home | Get Announcement |
| user_write | POST | `/home/announcement` | Home | Post Announcement |
| safe_read | GET | `/home/playing-songs` | Home, Mobile | Batch get to get every venue's currently playing song |
| operator_admin | GET | `/feed/streamInfo` | FeedFM |  |
| operator_admin | POST | `/feed/setStation` | FeedFM | Set the current station for a bar |
| operator_admin | GET | `/feed/stations` | FeedFM | Get a list of available stations |
| safe_read | GET | `/events` | Events | Get all events |
| user_write | POST | `/events` | Events | Add new event |
| safe_read | GET | `/events/old` | Events | Get Old events |
| safe_read | GET | `/events/current` | Events | Get current events |
| user_write | PUT | `/events/{eventId}` | Events | Update event |
| destructive | DELETE | `/events/{eventId}` | Events | Delete event by id |
| safe_read | GET | `/events/{eventId}/rsvp` | Events | Get all rsvps for the event |
| user_write | POST | `/events/{eventId}/rsvp` | Events, Mobile | Set users rsvp status |
| destructive | DELETE | `/events/{eventId}/rsvp` | Events | Remove users rsvp from event |
| user_write | POST | `/events/{eventId}/liveActivity` | Events | Handle Live Activity operations |
| user_write | POST | `/event/get-verification-code` | Event Page | Get verification code |
| user_write | POST | `/event/login-sms` | Event Page | Login with SMS |
| user_write | POST | `/event/logout` | Event Page | Logout |
| user_write | POST | `/event/verify-age` | Event Page | Verify and set user date of birth |
| user_write | POST | `/event/save-contact-info` | Event Page | Save underage contact info |
| user_write | POST | `/event/set-user-name` | Event Page | Set user name |
| safe_read | GET | `/event/profile-data` | Event Page | Get profile data |
| user_write | POST | `/event/{eventId}/comments` | Event Page | Post a comment |
| safe_read | GET | `/event/{eventId}/comments` | Event Page | Get comments for an event |
| user_write | POST | `/event/{eventId}/comments/{commentId}/react` | Event Page | React to a top-level comment |
| user_write | POST | `/event/{eventId}/comments/{parentCommentId}/{commentId}/react` | Event Page | React to a reply |
| user_write | POST | `/event/{eventId}/comments/{commentId}/like` | Event Page | Like a top-level comment |
| user_write | POST | `/event/{eventId}/comments/{parentCommentId}/{commentId}/like` | Event Page | Like a reply |
| user_write | POST | `/event/{eventId}/comments/{commentId}/report` | Event Page | Report a top-level comment |
| user_write | POST | `/event/{eventId}/comments/{parentCommentId}/{commentId}/report` | Event Page | Report a reply |
| destructive | DELETE | `/event/{eventId}/comments/{commentId}` | Event Page | Delete a top-level comment |
| destructive | DELETE | `/event/{eventId}/comments/{parentCommentId}/{commentId}` | Event Page | Delete a reply |
| user_write | POST | `/event/{eventId}/rsvp` | Event Page | RSVP to event |
| safe_read | GET | `/event/{eventId}/rsvp` | Event Page | Get user's RSVP for an event |
| safe_read | GET | `/event/{eventId}/guests` | Event Page | Get guest list for an event |
| safe_read | GET | `/event/{eventId}` | Event Page | Get event HTML |
| user_write | POST | `/chat/messages` | Chat, Mobile | Add message into the chat |
| safe_read | GET | `/bars/stream-info` | Bars | Get stream information for multiple bars |
| safe_read | GET | `/bars/{barId}` | Bars | Get a single bar by the barId |
| safe_read | GET | `/bars/{barId}/getannouncement` | Bars | Get anouncement message for specific bar |
| safe_read | GET | `/bars` | Bars, Mobile | Get all bars available |
| safe_read | GET | `/bars/{barId}/music` | Bars | Get a current music playing in the bar |
| safe_read | GET | `/bars/{barId}/queue` | Bars | Get queue for specific bar |
| user_write | POST | `/bars/{barId}/queue` | Bars | Add new music into the queue |
| user_write | POST | `/bars/{barId}/queue/batch` | Bars | Add multiple musics into the queue |
| user_write | POST | `/bars/{barId}/queue/reorder` | Bars | Reorder into the queue |
| user_write | POST | `/bars/{barId}/setannouncement` | Bars | Add new announcement into the bar |
| destructive | DELETE | `/bars/{barId}/queue/{musicId}` | Bars | Delete new music into the queue |
| destructive | DELETE | `/bars/{barId}/clear-queue` | Bars | Clear the queue |
| destructive | DELETE | `/bars/{barId}/clear-queue/{playlistId}` | Bars | Clear the queue by playlistId |
| user_write | POST | `/bars/{barId}/set-dj-name` | Bars | Set DJ on bar object |
| user_write | POST | `/bars/{barId}/venueEffect` | Bars | Play a venue effect |
| user_write | POST | `/bars/switchSource` | Bars | Switch venue music source |
| safe_read | GET | `/bars/{barId}/feed` | Bars | Get feed information for a specific bar |
| operator_admin | GET | `/admin/users` | ADMIN | Get all users |
| operator_admin | POST | `/admin/users` | ADMIN | Create new user |
| operator_admin | GET | `/admin/requests` | ADMIN | Get all requests |
| operator_admin | GET | `/admin/moderations/all` | ADMIN | Get counts of flagged content by user |
| operator_admin | GET | `/key/bars/{environment}/{barId}/getannouncement` | API | Get a single bar by the barId |
| operator_admin | GET | `/key/bars/{environment}/{barId}/getplaylist` | API | Get a current music playlist in the bar |
| operator_admin | POST | `/key/bars/{environment}/{barId}/peoples` | API | Add people count to the bar |
