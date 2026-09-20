/**
 * Placeholder stroke icon set — 2px, rounded caps, single family.
 *
 * P5 (design pass) replaces these with the real hand-drawn set with visible
 * wobble and hatching. Until then the rule that matters is already in force:
 * ONE family, no mixing. Dropping Lucide or Feather in alongside hand-drawn
 * icons is instantly visible and very hard to unsee.
 */
type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.4 10.6 12 3.6l8.6 7" />
    <path d="M5.4 10v9.2c0 .6.4 1 1 1h11.2c.6 0 1-.4 1-1V10" />
  </Svg>
);

export const IconTimetable = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.3" y="4.6" width="17.4" height="15.8" rx="3" />
    <path d="M3.6 9.4h16.8M8.4 3.4v3.4M15.6 3.4v3.4" />
  </Svg>
);

export const IconBoard = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 13.4v7.2" />
    <path d="M8.2 3.6h7.6l-1 5.1 2.6 2.3c.5.5.2 1.4-.5 1.4H7.1c-.7 0-1-.9-.5-1.4l2.6-2.3-1-5.1Z" />
  </Svg>
);

export const IconMoney = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.2" y="6.2" width="17.6" height="12.4" rx="3" />
    <path d="M3.4 10.6h17.2" />
    <circle cx="16.8" cy="15" r="1.2" />
  </Svg>
);

export const IconMe = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.8 20.3c.6-3.9 3.6-6.1 7.2-6.1s6.6 2.2 7.2 6.1" />
  </Svg>
);

export const IconAttendance = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 3.6v8.4l6 4.1" />
  </Svg>
);

export const IconAdvisor = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5v5.2M12 15.4v5.1" />
    <path d="m5.6 7.2 3.7 2.2M14.7 14.6l3.7 2.2" />
    <path d="m18.4 7.2-3.7 2.2M9.3 14.6l-3.7 2.2" />
    <circle cx="12" cy="12" r="2.6" />
  </Svg>
);

export const IconAssignment = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.2 3.7h8.3l4.3 4.4v12.2H6.2z" />
    <path d="M14.2 3.8v4.4h4.4" />
    <path d="M9.2 13.2h5.6M9.2 16.6h4" />
  </Svg>
);

export const IconGoal = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.3" />
    <circle cx="12" cy="12" r="4.4" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconFood = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7.1 3.6v7.2M4.7 3.6v4.2c0 1.4.9 2.5 2.4 2.7M9.5 3.6v4.2c0 1.4-.9 2.5-2.4 2.7" />
    <path d="M7.1 10.8v9.6" />
    <path d="M16.9 20.4v-6.6c-1.7 0-2.8-1.1-2.8-3 0-3.7 1.5-6.8 2.9-6.8s2.8 3.1 2.8 6.8c0 1.9-1.1 3-2.8 3" />
  </Svg>
);
