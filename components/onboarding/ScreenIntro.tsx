import { Text, View } from "react-native";

// The eyebrow → title → body block shared by every onboarding screen. The
// eyebrow is the app's signature micro-label (10px/800/uppercase, wide tracking)
// and the title is the big Archivo ExtraBold headline. Body is optional.
// `align` centres the block for intro/ready screens; steps with inputs sit left.
export type ScreenIntroProps = {
  eyebrow: string;
  title: string;
  body?: string;
  align?: "left" | "center";
};

export function ScreenIntro({
  eyebrow,
  title,
  body,
  align = "center",
}: ScreenIntroProps) {
  const centered = align === "center";
  return (
    <View className={centered ? "items-center" : "items-start"}>
      <Text className="text-eyebrow font-sans-extrabold uppercase text-text-faint">
        {eyebrow}
      </Text>
      <Text
        className={`mt-[10px] text-h1 font-sans-extrabold text-text ${
          centered ? "text-center" : ""
        }`}
      >
        {title}
      </Text>
      {body ? (
        <Text
          className={`mt-[12px] text-body font-sans text-text-secondary ${
            centered ? "text-center" : ""
          }`}
        >
          {body}
        </Text>
      ) : null}
    </View>
  );
}
