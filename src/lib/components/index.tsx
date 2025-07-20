import { isFunction } from "rxjs/internal/util/isFunction";
import {
  type Component,
  type ComponentProps,
  type JSX,
  type ValidComponent,
} from "solid-js";
import { Dynamic } from "solid-js/web";

type PropsWithClass<T extends ValidComponent> = Extract<
  ComponentProps<T>,
  { class?: string }
>;

export const propsOverride = <
  E extends C & { class?: string },
  C extends { class?: string },
>(
  comp: Component<C> | keyof JSX.IntrinsicElements,
  propsOverride:
    | Partial<E>
    | ((props: PropsWithClass<typeof comp>) => Partial<E>),
): Component<PropsWithClass<typeof comp>> => {
  return (props: PropsWithClass<typeof comp>) => {
    const newProps = () =>
      isFunction(propsOverride) ? propsOverride(props) : propsOverride;
    return (
      <Dynamic
        component={comp}
        {...props}
        {...newProps()}
        class={`${newProps().class} ${props.class || ""}`}
      />
    );
  };
};
