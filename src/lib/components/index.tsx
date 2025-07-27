import { isFunction } from "rxjs/internal/util/isFunction";
import {
  mergeProps,
  type Component,
  type ComponentProps,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

export const propsOverride =
  <C extends ValidComponent, E extends Partial<ComponentProps<C>>>(
    comp: C,
    propsOverride: E | ((props: ComponentProps<C>) => E),
  ): Component<ComponentProps<C>> =>
  (props: ComponentProps<C>) => {
    const mergedProps = () =>
      mergeProps(
        props,
        isFunction(propsOverride) ? propsOverride(props) : propsOverride,
      );
    return <Dynamic component={comp} {...mergedProps()} />;
  };
