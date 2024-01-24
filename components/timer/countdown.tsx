"use client";

import React from "react";

//TODO: add more display formats

interface Props {
  endTimestamp: bigint;
  displayFormat?: "dd:hh:mm:ss";
}

function getTimeLeft(endTimestamp: bigint): bigint {
  const timeLeft = endTimestamp - BigInt(Date.now());
  if (timeLeft < 0) {
    return 0n;
  }
  return timeLeft;
}

const day = BigInt(1000 * 60 * 60 * 24);
const hour = BigInt(1000 * 60 * 60);
const minute = BigInt(1000 * 60);
const second = BigInt(1000);

const Countdown = ({ endTimestamp }: Props) => {
  const [timeLeft, setTimeLeft] = React.useState<bigint>(
    getTimeLeft(endTimestamp)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endTimestamp));
    }, 1000);
    return () => clearInterval(interval);
  }, [endTimestamp]);

  const days = timeLeft / day;
  const hours = (timeLeft % day) / hour;
  const minutes = (timeLeft % hour) / minute;
  const seconds = (timeLeft % minute) / second;

  return (
    <>
      {`${days.toString()} : ${hours.toString()} : ${minutes.toString()} : ${seconds.toString()}`}
    </>
  );
};
export default Countdown;
