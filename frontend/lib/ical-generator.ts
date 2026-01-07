/**
 * iCal (ICS) File Generator for Meeting Exports
 * Generates RFC 5545 compliant iCalendar files
 */

interface ICalEventParams {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    status?: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION';
  }>;
  url?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}

function formatICalDate(date: Date): string {
  // Format: 20240315T143000Z (UTC)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // RFC 5545: Lines must be folded at 75 characters
  if (line.length <= 75) return line;

  const result: string[] = [];
  let current = line;

  while (current.length > 75) {
    result.push(current.substring(0, 75));
    current = ' ' + current.substring(75); // Continuation lines start with space
  }
  result.push(current);

  return result.join('\r\n');
}

export function generateICalEvent(params: ICalEventParams): string {
  const lines: string[] = [];

  // BEGIN:VCALENDAR
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Zenora//Meeting Scheduler//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:REQUEST');

  // BEGIN:VEVENT
  lines.push('BEGIN:VEVENT');

  // UID - Unique identifier
  lines.push(`UID:${params.uid}@zenora.ai`);

  // DTSTAMP - Creation timestamp
  lines.push(`DTSTAMP:${formatICalDate(new Date())}`);

  // DTSTART - Start time
  lines.push(`DTSTART:${formatICalDate(params.startTime)}`);

  // DTEND - End time
  lines.push(`DTEND:${formatICalDate(params.endTime)}`);

  // SUMMARY - Title
  lines.push(`SUMMARY:${escapeICalText(params.title)}`);

  // DESCRIPTION - Details
  if (params.description) {
    lines.push(`DESCRIPTION:${escapeICalText(params.description)}`);
  }

  // LOCATION - Meeting location or Zoom link
  if (params.location) {
    lines.push(`LOCATION:${escapeICalText(params.location)}`);
  }

  // URL - Zoom or meeting link
  if (params.url) {
    lines.push(`URL:${params.url}`);
  }

  // STATUS
  lines.push(`STATUS:${params.status || 'CONFIRMED'}`);

  // ORGANIZER
  lines.push(`ORGANIZER;CN="${escapeICalText(params.organizer.name)}":MAILTO:${params.organizer.email}`);

  // ATTENDEES
  if (params.attendees && params.attendees.length > 0) {
    for (const attendee of params.attendees) {
      const partStat = attendee.status || 'NEEDS-ACTION';
      lines.push(
        `ATTENDEE;CN="${escapeICalText(attendee.name)}";RSVP=TRUE;PARTSTAT=${partStat}:MAILTO:${attendee.email}`
      );
    }
  }

  // SEQUENCE - For updates
  lines.push('SEQUENCE:0');

  // Priority
  lines.push('PRIORITY:5');

  // TRANSP - Show as busy
  lines.push('TRANSP:OPAQUE');

  // CLASS - Public/Private
  lines.push('CLASS:PUBLIC');

  // END:VEVENT
  lines.push('END:VEVENT');

  // END:VCALENDAR
  lines.push('END:VCALENDAR');

  // Fold long lines and join with CRLF
  return lines.map(foldLine).join('\r\n');
}

export function generateICalFile(meetings: ICalEventParams[]): string {
  const lines: string[] = [];

  // BEGIN:VCALENDAR
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Zenora//Meeting Scheduler//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push('X-WR-CALNAME:Zenora Meetings');
  lines.push('X-WR-CALDESC:Exported meetings from Zenora');
  lines.push('X-WR-TIMEZONE:UTC');

  // Add each event
  for (const meeting of meetings) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${meeting.uid}@zenora.ai`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(meeting.startTime)}`);
    lines.push(`DTEND:${formatICalDate(meeting.endTime)}`);
    lines.push(`SUMMARY:${escapeICalText(meeting.title)}`);

    if (meeting.description) {
      lines.push(`DESCRIPTION:${escapeICalText(meeting.description)}`);
    }

    if (meeting.location) {
      lines.push(`LOCATION:${escapeICalText(meeting.location)}`);
    }

    if (meeting.url) {
      lines.push(`URL:${meeting.url}`);
    }

    lines.push(`STATUS:${meeting.status || 'CONFIRMED'}`);
    lines.push(`ORGANIZER;CN="${escapeICalText(meeting.organizer.name)}":MAILTO:${meeting.organizer.email}`);

    if (meeting.attendees && meeting.attendees.length > 0) {
      for (const attendee of meeting.attendees) {
        const partStat = attendee.status || 'NEEDS-ACTION';
        lines.push(
          `ATTENDEE;CN="${escapeICalText(attendee.name)}";RSVP=TRUE;PARTSTAT=${partStat}:MAILTO:${attendee.email}`
        );
      }
    }

    lines.push('SEQUENCE:0');
    lines.push('CLASS:PUBLIC');
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  }

  // END:VCALENDAR
  lines.push('END:VCALENDAR');

  return lines.map(foldLine).join('\r\n');
}

// Helper to convert response status to PARTSTAT
export function responseStatusToPartStat(status: string): 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'NEEDS-ACTION' {
  switch (status) {
    case 'ACCEPTED':
      return 'ACCEPTED';
    case 'DECLINED':
      return 'DECLINED';
    case 'TENTATIVE':
      return 'TENTATIVE';
    default:
      return 'NEEDS-ACTION';
  }
}
