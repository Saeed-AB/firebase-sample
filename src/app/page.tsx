"use client"
import PrintFirebaseNotification from "@/app/components/PrintFirebaseNotification";
import SubscribeUnSubscribeActions from "@/app/components/SubscribeUnSubscribeActions";
import TopicsList from "@/app/components/TopicsList";
import { Button } from "@/components/atoms/Button";
import Loader from "@/components/atoms/Loader";
import { initializeFirebaseApp } from "@/firebase";
import useCopy from "@/hooks/useCopy";
import { addToken, deleteToken, getDBToken } from "@/lib/db";
import { FiltersStateT } from "@/sharedTypes";
import { confirmationStore } from "@/store/firebase";
import { Fragment, useEffect, useState } from "react";
import toast from "react-hot-toast";

const broadcastChannel = new BroadcastChannel("background-message-channel");
const firebaseServerKey = process.env.NEXT_PUBLIC_FIREBASE_SERVER_KEY;

function Home() {
  const {
    firebaseToken,
    onShowNotificationModal,
    onUpdateLastNotificationMessage,
    onUpdateToken,
  } = confirmationStore((store) => store);
  const { isCopied, onCopy } = useCopy();

  const [filters, setFilters] = useState<FiltersStateT>({
    search: "",
  });

  const [isInitializePending, setIsInitializePending] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const showMessages = (payload: MessageEvent) => {
    console.log("firebase foreground message", payload.data);
    onShowNotificationModal(true);
    onUpdateLastNotificationMessage(payload?.data);
  };

  const handleUpdateToken = async () => {
    await deleteToken(firebaseToken ?? "");
    window.location.reload();
  };

  const handleUpdateFilters = <Key extends keyof FiltersStateT>(
    key: Key,
    value: FiltersStateT[Key]
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const firebaseInitialize = async () => {
    const cachedToken = await getDBToken();

    if (cachedToken) {
      setIsInitializePending(false);
      onUpdateToken(cachedToken);
      return;
    }

    initializeFirebaseApp((t) => {
      setIsInitializePending(false);

      if (t) {
        addToken(t);
        onUpdateToken(t);
      }
    });
  };

  const getAvailabilityError = async () => {
    if (!("Notification" in window)) {
      return "Your browser doesn't support Notification";
    }

    if ("Notification" in window) {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        return "API_KEY is missing in .env file";
      }

      if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
        return "VAPID_KEY is missing in .env file";
      }

      const notificationPermission = await Notification.requestPermission();

      if (notificationPermission !== "granted") {
        return "Notification not granted, Please Enable it";
      }
    }
  };

  useEffect(() => {
    (async () => {
      const firebaseError = await getAvailabilityError();

      if (firebaseError) {
        // not able to show notification
        setIsInitializePending(false);
        setErrorMessage(firebaseError);
        toast.error(firebaseError);
        console.error(firebaseError);
        return;
      }

      firebaseInitialize();

      navigator.serviceWorker?.addEventListener("message", showMessages);
      broadcastChannel.addEventListener("message", (event) => {
        if (event.data && event.data.type === "FORWARD_BACKGROUND_MESSAGE") {
          showMessages(event);
        }
      });
    })();
    return () => {
      broadcastChannel.removeEventListener("message", showMessages);
      navigator.serviceWorker?.removeEventListener("message", showMessages);
    };
  }, []);

  return (
    <Fragment>
      <div className="flex items-center justify-center w-full h-screen">
        <div className="flex flex-col gap-7 w-[500px] bg-[#f1faee] h-fit rounded-lg justify-center items-center  p-4">
          <h1 className="text-center text-xl">Test Firebase messages</h1>
          {isInitializePending ? (
            <Loader />
          ) : (
            <Fragment>
              {errorMessage || !firebaseToken ? (
                <h1 className="text-center text-xl text-red-500">
                  {errorMessage || "No registration token available"}
                </h1>
              ) : (
                <>
                  <Button
                    disabled={isCopied}
                    onClick={() => onCopy(firebaseToken ?? "")}
                    label={isCopied ? "Copied!" : "Copy Token"}
                  />

                  <Button onClick={handleUpdateToken} label="Update Token" />
                  <PrintFirebaseNotification />

                  {!!firebaseServerKey && (
                    <>
                      <SubscribeUnSubscribeActions />

                      <input
                        className="input"
                        value={filters.search}
                        onChange={(e) =>
                          handleUpdateFilters("search", e.target.value)
                        }
                        placeholder="Search on Topics"
                      />

                      <TopicsList search={filters.search} />
                    </>
                  )}
                </>
              )}
            </Fragment>
          )}
        </div>
      </div>
    </Fragment>
  );
}

export default Home;
