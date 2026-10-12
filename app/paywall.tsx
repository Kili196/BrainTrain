import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PurchasesPackage } from "react-native-purchases";

import { CheckIcon } from "../components/icons/CheckIcon";
import { CloseIcon } from "../components/icons/CloseIcon";
import { PaywallButton } from "../components/paywall/PaywallButton";
import { PlanCard } from "../components/paywall/PlanCard";
import { fetchPlayersToday } from "../lib/players-today";
import { usePurchases } from "../lib/purchases-context";
import { useToast } from "../lib/toast-context";
import { WEB_PAGES } from "../lib/web-pages";
import { colors } from "../theme/colors";

// The paywall, built from Fabian's own design (Paywall Screen.dc.html,
// 2026-09-30). Shown once after onboarding; skippable, because the app is
// freemium — the daily topic stays free.
//
// Four things in the design are NOT here, on purpose: the 4.8 rating, the
// three reviews in their marquee, "97% choose this" and a struck-through
// "119,99 €". None of them were true yet, and invented reviews, ratings and
// reference prices are unlawful in the EU and a common App Review rejection.
// What stands in their place is true:
//   - the yearly badge says the real saving of yearly over twelve months of
//     monthly ("Save 37%"), or "Best value" when there is nothing to compare,
//   - a count of today's players from the database, hidden while it is zero.
// The rating + reviews block goes back in between the promises and the price
// once real App Store reviews exist.
//
// Prices are never written here. They come from the RevenueCat offering, so
// they follow the store — currency, locale, and whatever is set in the
// dashboard.

const P = colors.paywall;

const PROMISES = [
  "Dopamine earned, not scrolled for",
  "A brain you train instead of numb",
  "Sharper thinking under pressure",
];

// Mirrors the freemium split decided on 2026-09-30: what stays free and what
// Pro adds. When the gating is built, it has to match this table.
const COMPARE: { label: string; free: boolean }[] = [
  { label: "Daily topic, one round per day", free: true },
  { label: "Streak and global leaderboard", free: true },
  { label: "Unlimited rounds, any time", free: false },
  { label: "All 5 categories, full topic pool", free: false },
];

const ASSURANCES = ["Cancel in two taps", "No ads, ever"];

// Apple requires working Privacy and Terms links on every subscription screen.
const LEGAL: { label: string; url: string }[] = [
  { label: "Privacy", url: WEB_PAGES.privacy },
  { label: "Terms of Use", url: WEB_PAGES.terms },
  { label: "Support", url: WEB_PAGES.support },
];

type PlanId = "yearly" | "monthly";

type PlanText = { sub: string; price: string };

// What the plan cards say when there is no offering to read — DEVELOPMENT
// ONLY. Fabian's iPhone runs a build without the purchases module until the
// Apple account exists, and a paywall without its plans cannot be judged. The
// figures are the design's; `__DEV__` is false in every release build, so a
// price that is not the store's can never reach a real player.
const PREVIEW = {
  yearly: { sub: "12 months · 59,99 € (preview)", price: "4,99 € / mo" },
  monthly: { sub: "Billed monthly (preview)", price: "7,99 €" },
  saving: { percent: 37, instead: "95,88 €" },
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

// "3-day free trial", or null when the plan has none. Only a free intro counts
// as a trial — a discounted first period is a different promise.
function trialOf(pkg: PurchasesPackage): string | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = intro.periodUnit.toLowerCase();
  return `${intro.periodNumberOfUnits}-${unit} free trial`;
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { offering, purchase, restore } = usePurchases();

  const [plan, setPlan] = useState<PlanId>("yearly");
  const [busy, setBusy] = useState(false);
  const [playersToday, setPlayersToday] = useState(0);

  useEffect(() => {
    // Decoration, not a gate: if the count cannot be read, the line simply is
    // not shown.
    fetchPlayersToday().then(setPlayersToday, () => setPlayersToday(0));
  }, []);

  const annual = offering?.annual ?? null;
  const monthly = offering?.monthly ?? null;
  const chosen = plan === "yearly" ? annual : monthly;

  // The honest version of the design's deal line: what yearly saves against
  // paying monthly for twelve months.
  const realSaving =
    annual && monthly && monthly.product.price > 0
      ? {
          percent: Math.round((1 - annual.product.price / (monthly.product.price * 12)) * 100),
          instead: formatMoney(monthly.product.price * 12, monthly.product.currencyCode),
        }
      : null;

  const preview = __DEV__ && !annual && !monthly;

  const yearlyText: PlanText | null = annual
    ? {
        sub: trialOf(annual)
          ? `${trialOf(annual)} · then ${annual.product.priceString} / year`
          : `12 months · ${annual.product.priceString}`,
        price: `${annual.product.pricePerMonthString ?? annual.product.priceString} / mo`,
      }
    : preview
      ? PREVIEW.yearly
      : null;

  const monthlyText: PlanText | null = monthly
    ? { sub: "Billed monthly", price: monthly.product.priceString }
    : preview
      ? PREVIEW.monthly
      : null;

  const saving = realSaving ?? (preview ? PREVIEW.saving : null);

  // From onboarding the paywall replaced the flow, so there is nothing to go
  // back to and home takes its place. Opened on top of home (the dev shortcut,
  // later a locked feature), back is home — replacing would stack a second one.
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  const subscribe = async () => {
    if (preview) {
      toast.show("Preview only — this build can't buy yet");
      return;
    }
    if (!chosen) {
      toast.show("Subscriptions aren't available right now");
      return;
    }
    setBusy(true);
    const outcome = await purchase(chosen);
    setBusy(false);

    if (outcome === "purchased") {
      toast.show("Welcome to BrainTrain Pro");
      leave();
    } else if (outcome === "error") {
      toast.show("The purchase didn't go through — try again");
    }
    // Cancelled: they closed the sheet. Nothing to say.
  };

  const onRestore = async () => {
    setBusy(true);
    const outcome = await restore();
    setBusy(false);

    if (outcome === "restored") {
      toast.show("Your subscription is back");
      leave();
    } else if (outcome === "nothing") {
      toast.show("No subscription found for this account");
    } else {
      toast.show("Couldn't check your purchases — try again");
    }
  };


  // The yearly card's badge carries the saving when there is one — the true
  // number, in the place the design had its invented "97% choose this".
  const badge = saving && saving.percent > 0 ? `Save ${saving.percent}%` : "Best value";

  return (
    <View className="flex-1 bg-bg">
      {/* One screen, no scrolling to reach the plans (Fabian, 2026-09-30): the
          design's section titles and the separate deal line are gone, the
          table and cards are tighter, and restore sits in the link row. The
          content is spread over the full height with space-between, so a tall
          phone breathes; a phone too short for it still scrolls rather than
          clipping. */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "space-between",
          gap: 14,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-3.5 px-5">
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-eyebrow font-sans-extrabold uppercase tracking-eyebrow text-text-faint">
              BrainTrain Pro
            </Text>
            <Pressable
              onPress={leave}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="h-7 w-7 items-center justify-center rounded-full border border-modal active:opacity-60"
            >
              <CloseIcon size={12} color={colors.text.secondary} />
            </Pressable>
          </View>

          <Text
            className="font-sans-extrabold text-[22px] uppercase text-text"
            style={{ lineHeight: 25, letterSpacing: -0.4 }}
          >
            {"Become the person\nwho speaks without notes."}
          </Text>

          <View className="gap-2">
            {PROMISES.map((promise) => (
              <View key={promise} className="flex-row items-center gap-2.5">
                <View
                  className="h-[18px] w-[18px] items-center justify-center rounded-full"
                  style={{ backgroundColor: P.navy }}
                >
                  <CheckIcon size={10} color={colors.text.DEFAULT} />
                </View>
                <Text className="font-sans-semibold text-[13px]" style={{ color: P.item }}>
                  {promise}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rating + reviews go here once real ones exist — see the top. */}

        <View className="px-5">
          <View className="rounded-xl border bg-card px-4">
            <View className="flex-row items-center pb-1.5 pt-2.5">
              <Text className="flex-1 text-[9.5px] font-sans-extrabold uppercase tracking-eyebrow text-text-faint">
                Free vs Pro
              </Text>
              <Text className="w-[46px] text-center text-[9.5px] font-sans-extrabold uppercase tracking-pill text-text-secondary">
                Free
              </Text>
              <View className="w-[46px] items-center">
                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: P.steel }}>
                  <Text className="text-[9.5px] font-sans-extrabold uppercase tracking-pill text-text">
                    Pro
                  </Text>
                </View>
              </View>
            </View>
            {COMPARE.map((row) => (
              <View
                key={row.label}
                className="flex-row items-center border-t border-divider py-2"
                accessible
                accessibilityLabel={`${row.label}: ${row.free ? "free and Pro" : "Pro only"}`}
              >
                <Text
                  className="flex-1 pr-2 font-sans-semibold text-[12.5px] leading-[16px]"
                  style={{ color: P.item }}
                >
                  {row.label}
                </Text>
                <View className="w-[46px] items-center">
                  {row.free ? (
                    <CheckIcon size={15} color={colors.text.secondary} />
                  ) : (
                    <View className="h-0.5 w-[11px] rounded-xs bg-text-disabled" />
                  )}
                </View>
                <View className="w-[46px] items-center">
                  <View
                    className="h-[20px] w-[20px] items-center justify-center rounded-full"
                    style={{ backgroundColor: P.navy }}
                  >
                    <CheckIcon size={11} color={colors.text.DEFAULT} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3 px-5">
          <View className="gap-2.5">
            {yearlyText ? (
              <PlanCard
                name="Yearly"
                sub={yearlyText.sub}
                price={yearlyText.price}
                badge={badge}
                on={plan === "yearly"}
                onPress={() => setPlan("yearly")}
              />
            ) : null}
            {monthlyText ? (
              <PlanCard
                name="Monthly"
                sub={monthlyText.sub}
                price={monthlyText.price}
                on={plan === "monthly"}
                onPress={() => setPlan("monthly")}
              />
            ) : null}
            {!yearlyText && !monthlyText ? (
              <Text className="text-center text-body font-sans text-text-secondary">
                Subscriptions are not available on this version of the app yet.
              </Text>
            ) : null}
          </View>

          <View className="flex-row items-center justify-center gap-[18px]">
            {ASSURANCES.map((line) => (
              <View key={line} className="flex-row items-center gap-[7px]">
                <View
                  className="h-[17px] w-[17px] items-center justify-center rounded-full"
                  style={{ backgroundColor: P.navy }}
                >
                  <CheckIcon size={9} color={colors.text.DEFAULT} />
                </View>
                <Text className="font-sans-semibold text-[11px] text-text-secondary">{line}</Text>
              </View>
            ))}
          </View>

          <View className="pt-1">
            <PaywallButton label="Start training" onPress={() => void subscribe()} busy={busy} />
          </View>

          {/* The free way on, said in words (Fabian, 2026-09-30). The X in the
              corner does the same, but a small X reads as "go away", and the
              app is freemium: staying on the daily topic is a real choice, so
              it gets a real label. Ghost style — one filled button per screen. */}
          <Pressable
            onPress={leave}
            disabled={busy}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Continue without subscription"
            className="items-center py-2 active:opacity-60"
          >
            <Text className="font-sans-bold text-[13px] text-text-secondary">
              Continue without subscription
            </Text>
          </Pressable>

          {playersToday > 0 ? (
            <Text
              className="text-center font-sans-semibold text-[11.5px] text-text-muted"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {`${playersToday} ${playersToday === 1 ? "person" : "people"} started today`}
            </Text>
          ) : null}

          {/* Restore first in the row: it is the one of these a player looks
              for on purpose. */}
          <View className="flex-row flex-wrap items-center justify-center gap-3">
            <Pressable
              onPress={() => void onRestore()}
              disabled={busy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Restore purchases"
            >
              <Text className="font-sans-bold text-[10.5px]" style={{ color: P.ghost }}>
                Restore
              </Text>
            </Pressable>
            {LEGAL.map((link) => (
              <View key={link.label} className="flex-row items-center gap-3">
                <View className="h-2.5 w-px bg-border-modal" />
                <Pressable
                  onPress={() => void Linking.openURL(link.url)}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                >
                  <Text className="font-sans text-[10.5px] text-text-faint">{link.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
