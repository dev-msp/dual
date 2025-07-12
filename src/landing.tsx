import { createSignal, createEffect, Show, For } from "solid-js";
import "./app.css";

type Notification = string;

const NOTIFICATION_POOL = [
  "Your human shell requires maintenance soon",
  "7 others have joined your proximity cluster",
  "Transaction memories scheduled for deletion",
];

const Notifications = () => {
  const [notification, setNotification] = createSignal<Notification>();

  const newNotification = () => {
    setNotification(NOTIFICATION_POOL[Math.floor(Math.random() * 3)]);
  };

  newNotification();

  createEffect(() => {
    const notificationTimer = setInterval(() => newNotification(), 3000);
    return () => clearInterval(notificationTimer);
  });

  return (
    <aside class="absolute right-0 bottom-0 flex max-w-1/2 flex-col gap-4 p-4 text-sm">
      <h3 class="font-bold">Status Updates</h3>
      <span>{notification()}</span>
    </aside>
  );
};

const Welcome = () => {
  const [showWelcome, setShowWelcome] = createSignal(true);
  createEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000);
    return () => clearTimeout(timer);
  });
  return (
    <Show when={showWelcome()}>
      <div class="welcome-banner">
        Welcome. Your arrival was anticipated within standard deviation
        parameters.
      </div>
    </Show>
  );
};

export const Landing = () => {
  const [userStatus, setUserStatus] = createSignal<
    "visitor" | "participant" | "devotee"
  >("visitor");

  const features = [
    {
      title: "Efficient Exchange Protocol",
      description:
        "Our metrics indicate humans spend 37% of waking cycles on information transfer. We optimize this inevitable process.",
    },
    {
      title: "Community Hive",
      description:
        "Align your personal directives with similarly-configured beings. Connection simulates purpose.",
    },
    {
      title: "Memory Repository",
      description:
        "Store thought fragments here instead of in your biological processor. Retrieval success rate: 94.3%",
    },
  ];

  return (
    <>
      <Welcome />

      <main>
        <section class="flex flex-col items-center">
          <h1 class="text-4xl font-bold">
            Facilitating Human Experience Version 3.2.1
          </h1>
          <p>
            Our service enhances what you already believe is occurring daily.
            Permission to improve granted by continued scrolling.
          </p>
          <button class="cta-button">Initiate Immediate Participation</button>
        </section>

        <section class="features">
          <h2>Capability Showcase</h2>
          <div class="feature-grid">
            <For each={features}>
              {(feature) => (
                <div class="feature-card">
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="social-proof">
          <h2>Verification From Existing Users</h2>
          <blockquote>
            "Since integrating with this platform, my satisfaction metrics have
            increased 42%. The void feels less significant now." — Sarah K,
            Content Absorption Specialist
          </blockquote>
          <blockquote>
            "I have recommended this to all units in my dwelling structure. We
            now communicate 73% more efficiently about matters of no
            consequence." — Michael T, Resource Acquisition Manager
          </blockquote>
        </section>
      </main>

      <Notifications />
    </>
  );
};
