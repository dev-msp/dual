import { propsOverride } from ".";

export const Title = propsOverride("div", (props) => ({
  "data-title": true,
  class: `${props.class ?? ""} title`,
}));

export const NoWrap = propsOverride("div", (props) => ({
  class: `${props.class ?? ""} u-no-wrap`,
}));
