import * as React from 'react';
import * as classNames from 'classnames';
import { Dropdown } from '@console/internal/components/utils';
import { InputGroup, TextInput, ValidatedOptions, InputGroupItem } from '@patternfly/react-core';
import { TimeUnits } from '../constants/bucket-class';

export const TimeDurationDropdown: React.FC<TimeDurationDropdownProps> = ({
  id,
  inputClassName,
  onChange,
  required,
  testID,
  placeholder,
  inputID,
}) => {
  const [unit, setUnit] = React.useState(TimeUnits.HOUR);
  const [value, setValue] = React.useState(0);
  const [validated, setValidated] = React.useState(ValidatedOptions.success);

  const onValueChange = (_event, val) => {
    setValue(val);
    onChange({ value: val, unit }, setValidated);
  };

  const onUnitChange = (newUnit) => {
    setUnit(newUnit);
    onChange({ value, unit: newUnit }, setValidated);
  };

  return (
    <InputGroup translate="no">
      <InputGroupItem isFill>
        <TextInput
          className={classNames('pf-v5-c-form-control', inputClassName)}
          type="number"
          onChange={onValueChange}
          placeholder={placeholder}
          data-test={testID}
          value={value}
          id={inputID}
          validated={validated}
        />
      </InputGroupItem>
      <InputGroupItem>
        <Dropdown
          title={TimeUnits.HOUR}
          selectedKey={unit}
          items={TimeUnits}
          onChange={onUnitChange}
          required={required}
          id={id}
        />
      </InputGroupItem>
    </InputGroup>
  );
};

type TimeDurationDropdownProps = {
  id: string;
  placeholder?: string;
  inputClassName?: string;
  onChange: Function;
  required?: boolean;
  testID?: string;
  inputID?: string;
};
