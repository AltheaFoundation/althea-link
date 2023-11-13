"use client";

import Text from "@/components/text";
import Rive, { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { useCallback, useEffect, useState } from "react";

interface PropLinkButton {
  text: string;
}

const FooterButton = ({ text }: PropLinkButton) => {
  const [name, setName] = useState("dark");

  const { rive, RiveComponent } = useRive({
    src: "anims/toggle.riv",
    artboard: "Toggle",
    stateMachines: ["toggle"],
    animations: ["on", "off"],

    autoplay: true,
    shouldDisableRiveListeners: true,
  });

  const isToggled = useStateMachineInput(rive, "toggle", "switch");

  const onButtonActivate = useCallback(() => {
    if (rive && isToggled) {
      isToggled.value = true;
    }
  }, [rive, isToggled]);

  const onButtonDeactivate = useCallback(() => {
    if (rive && isToggled) {
      isToggled.value = false;
    }
  }, [rive, isToggled]);

  function setTheme(themeName: string) {
    themeName =
      themeName === "dark" || themeName === "light" ? themeName : "dark";
    document.body.classList.add(themeName);

    document.body.classList.remove(themeName == "dark" ? "light" : "dark");
    localStorage.setItem("theme", themeName);
    setName(themeName == "dark" ? "light" : "dark");
  }
  useEffect(() => {
    setTheme(localStorage.getItem("theme") as string);
    const themeName = localStorage.getItem("theme");
    // const localName =
    //   themeName === "dark" || themeName === "light" ? themeName : "dark";
    setName(
      (localStorage.getItem("theme") as string) == "dark" ? "light" : "dark"
    );
  }, []);

  useEffect(() => {
    if (!document.body.classList.contains("dark")) onButtonDeactivate();
    else onButtonActivate();
  }, [onButtonActivate, onButtonDeactivate]);

  return (
    <button
      style={{
        paddingLeft: "1rem",
        height: "100%",
      }}
      onClick={() => {
        document.body.classList.contains("dark")
          ? setTheme("light")
          : setTheme("dark");
        if (!document.body.classList.contains("dark")) onButtonDeactivate();
        else onButtonActivate();
      }}
    >
      <RiveComponent
        height={60}
        width={60}
        style={{
          height: "40px",
          width: "40px",
        }}
      />
    </button>
  );
};

export default FooterButton;
