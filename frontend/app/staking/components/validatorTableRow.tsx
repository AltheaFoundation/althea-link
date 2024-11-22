import Button from "@/components/button/button";
import Container from "@/components/container/container";
import Icon from "@/components/icon/icon";
import {
  UnbondingDelegation,
  Validator,
  ValidatorWithDelegations,
} from "@/hooks/staking/interfaces/validators";
import Text from "@/components/text";
import { displayAmount } from "@/utils/formatting";
import Analytics from "@/provider/analytics";
import { getAnalyticsStakingInfo } from "@/utils/analytics";

export const GenerateValidatorTableRow = (
  validator: Validator,
  index: number,
  onDelegate: (validator: Validator) => void
) => [
  <Container key={`name_${index}`}>
    <Text font="macan-font">{validator.rank}</Text>
  </Container>,
  <Container key={`name_${index}`}>
    <div style={{ width: "300px" }}>
      <Text font="macan-font">{validator.description.moniker}</Text>
    </div>
  </Container>,
  <Container
    key={`tokens_${index}`}
    direction="row"
    center={{ horizontal: true, vertical: true }}
    gap="auto"
  >
    <Text font="macan-font">{displayAmount(validator.tokens, 18)} </Text>
    <div> </div>
    <Icon
      style={{ marginLeft: "5px" }}
      icon={{
        url: "/althea.svg",
        size: 24,
      }}
      themed={true}
    />
  </Container>,
  <Container key={`commission_${index}`}>
    <Text font="macan-font">
      {displayAmount(validator.commission, -2, { precision: 2 })}%
    </Text>
  </Container>,
  <Container key={`button_${index}`}>
    <Button
      onClick={() => {
        Analytics.actions.events.staking.delegateClicked(
          getAnalyticsStakingInfo(validator, "0")
        );
        onDelegate(validator);
      }}
      disabled={validator.jailed || validator.rank > 10}
    >
      DELEGATE
    </Button>
  </Container>,
];

export const GenerateMyStakingTableRow = (
  userStakedValidator: ValidatorWithDelegations,
  index: number,
  onDelegate: (validator: Validator) => void
) => [
  <Container key={`name_${index}`}>
    <Text font="macan-font">{userStakedValidator?.description.moniker}</Text>
  </Container>,
  <Container
    key={`mystake_${index}`}
    direction="row"
    center={{ horizontal: true, vertical: true }}
    gap="auto"
  >
    <Text font="macan-font">
      {displayAmount(userStakedValidator.userDelegation.balance, 18, {
        short: false,
      })}{" "}
    </Text>
    <div> </div>
    <Icon
      style={{ marginLeft: "5px" }}
      icon={{
        url: "/althea.svg",
        size: 24,
      }}
      themed={true}
    />
  </Container>,
  <Container
    key={`tokens_${index}`}
    direction="row"
    center={{ horizontal: true, vertical: true }}
    gap="auto"
  >
    <Text font="macan-font">
      {displayAmount(userStakedValidator?.tokens, 18, {})}
    </Text>
    <div> </div>
    <Icon
      style={{ marginLeft: "5px" }}
      icon={{
        url: "/althea.svg",
        size: 24,
      }}
      themed={true}
    />
  </Container>,
  <Container key={`commission_${index}`}>
    <Text font="macan-font">
      {displayAmount(userStakedValidator?.commission, -2, {
        precision: 2,
      })}
      %
    </Text>
  </Container>,
  <Container key={`buttonManage_${index}`}>
    <Button
      onClick={() => {
        Analytics.actions.events.staking.manageClicked(
          getAnalyticsStakingInfo(
            userStakedValidator,
            userStakedValidator.userDelegation.balance
          )
        );
        onDelegate(userStakedValidator);
      }}
    >
      MANAGE
    </Button>
  </Container>,
];

export const GenerateUnbondingDelegationsTableRow = (
  userStakedValidator: UnbondingDelegation,
  index: number
) => [
  <Container key={`name_${index}`}>
    <Text font="macan-font">{userStakedValidator.validator_address}</Text>
  </Container>,
  <Container
    key={`mystake_${index}`}
    direction="row"
    center={{ horizontal: true, vertical: true }}
    gap="auto"
  >
    <Text font="macan-font">
      {displayAmount(userStakedValidator.balance, 18, {
        short: false,
      })}{" "}
    </Text>
    <div> </div>
    <Icon
      style={{ marginLeft: "5px" }}
      icon={{
        url: "/althea.svg",
        size: 24,
      }}
      themed={true}
    />
  </Container>,
  <Container key={`name_${index}`}>
    <Text font="macan-font">
      {new Date(userStakedValidator.completion_date).toDateString() +
        ", " +
        new Date(userStakedValidator.completion_date).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }) +
        (new Date(userStakedValidator.completion_date).getHours() >= Number(12)
          ? "PM"
          : "AM")}
    </Text>
  </Container>,
];
