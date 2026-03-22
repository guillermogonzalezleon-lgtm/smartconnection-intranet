// @ts-nocheck
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';
import { motion } from 'framer-motion';

// Schema de validación
const contactFormSchema = yup.object().shape({
  nombre: yup.string()
    .required('El nombre es obligatorio')
    .min(2, 'Debe tener al menos 2 caracteres')
    .max(50, 'Debe tener menos de 50 caracteres')
    .matches(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/, 'Nombre inválido'),
  email: yup.string()
    .required('El email es obligatorio')
    .email('Email inválido')
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Formato de email inválido'),
  telefono: yup.string()
    .required('El teléfono es obligatorio')
    .matches(/^\+?[0-9\s-]{8,15}$/, 'Teléfono inválido (ej: +56912345678 o 912345678)'),
});

const ContactForm: React.FC = () => {
  const { register, handleSubmit, errors } = useForm({
    resolver: yupResolver(contactFormSchema),
  });

  const onSubmit = async (data: any) => {
    try {
      const response = await axios.post('/api/contact', data);
      console.log(response);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <label>
        Nombre:
        <input type="text" {...register('nombre')} />
        {errors.nombre && <div>{errors.nombre.message}</div>}
      </label>
      <label>
        Email:
        <input type="email" {...register('email')} />
        {errors.email && <div>{errors.email.message}</div>}
      </label>
      <label>
        Teléfono:
        <input type="text" {...register('telefono')} />
        {errors.telefono && <div>{errors.telefono.message}</div>}
      </label>
      <button type="submit">Enviar</button>
    </form>
  );
};

export default ContactForm;