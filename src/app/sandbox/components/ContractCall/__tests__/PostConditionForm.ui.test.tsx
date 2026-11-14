import { renderWithChakraProviders } from '@/common/utils/test-utils/render-utils';
import userEvent from '@testing-library/user-event';
import { Form, Formik } from 'formik';

import { PostConditionMode, PostConditionType } from '@stacks/transactions';

import { FunctionFormikState } from '../FunctionView';
import { PostConditionForm } from '../PostConditionForm';

jest.mock('@/common/components/Select', () => ({
  Select: ({ items, label, onValueChange, placeholder, value }: any) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value?.[0] ?? ''}
        onChange={event => onValueChange?.({ value: [event.target.value] })}
      >
        <option value="">{placeholder}</option>
        {items.map((item: { label: string; value: string }) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

function renderPostConditionForm() {
  return renderWithChakraProviders(
    <Formik
      initialValues={
        {
          postConditionMode: PostConditionMode.Allow,
          postConditions: [],
        } as FunctionFormikState
      }
      onSubmit={jest.fn()}
    >
      {({ errors, setFieldValue, values }) => (
        <Form>
          <PostConditionForm values={values} errors={errors} formikSetFieldValue={setFieldValue} />
          <output data-testid="post-condition-state">
            {JSON.stringify(values.postConditions)}
          </output>
        </Form>
      )}
    </Formik>
  );
}

function getPostConditionState(): Array<{
  postConditionType?: PostConditionType;
  postConditionAddress?: string;
}> {
  return JSON.parse(
    document.querySelector('[data-testid="post-condition-state"]')?.textContent ?? '[]'
  );
}

describe('PostConditionForm', () => {
  it('adds, independently edits, removes, and reindexes post conditions', async () => {
    const user = userEvent.setup();
    const { getAllByLabelText, getByLabelText, getByRole, queryByText } = renderPostConditionForm();

    await user.click(getByRole('button', { name: 'Add post-condition' }));
    await user.selectOptions(
      getByLabelText('Post-condition 1 type'),
      String(PostConditionType.STX)
    );
    expect(getByLabelText('Principal')).toHaveValue('origin');
    await user.clear(getByLabelText('Principal'));
    await user.type(getByLabelText('Principal'), 'first-address');

    const amount = getByLabelText('Amount');
    expect(amount).toHaveAttribute('type', 'text');
    expect(amount).toHaveAttribute('inputmode', 'numeric');

    await user.click(getByRole('button', { name: 'Add post-condition' }));
    await user.selectOptions(
      getByLabelText('Post-condition 2 type'),
      String(PostConditionType.PoX)
    );
    await user.clear(getAllByLabelText('Principal')[1]);
    await user.type(getAllByLabelText('Principal')[1], 'second-address');

    expect(
      getPostConditionState().map(condition => ({
        type: condition.postConditionType,
        address: condition.postConditionAddress,
      }))
    ).toEqual([
      { type: PostConditionType.STX, address: 'first-address' },
      { type: PostConditionType.PoX, address: 'second-address' },
    ]);

    await user.click(getByRole('button', { name: 'Remove post-condition 1' }));

    expect(getPostConditionState()).toHaveLength(1);
    expect(getPostConditionState()[0]).toMatchObject({ postConditionType: PostConditionType.PoX });
    expect(getByLabelText('Post-condition 1 type')).toHaveValue(String(PostConditionType.PoX));
    expect(getByLabelText('Principal')).toHaveValue('second-address');
    expect(queryByText('Post-condition 2')).not.toBeInTheDocument();
  });
});
