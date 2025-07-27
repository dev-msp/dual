import {
  mergeProps,
  type Component,
  type ComponentProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

export const propsOverride = <
  C extends ValidComponent,
  E extends ComponentProps<C> & { component?: never },
>(
  comp: C,
  propsOverride: E,
): Component<E> => {
  return (props: ComponentProps<C>) => {
    const mergedProps = mergeProps(props, propsOverride);
    return <Dynamic component={comp} {...mergedProps} />;
  };
};
