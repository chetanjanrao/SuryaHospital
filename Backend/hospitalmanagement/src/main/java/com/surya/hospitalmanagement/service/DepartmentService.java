
package com.surya.hospitalmanagement.service;

import com.surya.hospitalmanagement.dto.DepartmentDTO;
import com.surya.hospitalmanagement.entity.Department;
import com.surya.hospitalmanagement.repository.DepartmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    // Get all departments
    public List<DepartmentDTO> getAllDepartments() {
        return departmentRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    // Get department by ID
    public DepartmentDTO getDepartmentById(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Department not found with ID: " + id));

        return convertToDTO(department);
    }

    // Create department
    public DepartmentDTO createDepartment(DepartmentDTO departmentDTO) {
        Department department = convertToEntity(departmentDTO);

        // Let the database generate the ID
        department.setId(null);

        Department savedDepartment = departmentRepository.save(department);

        return convertToDTO(savedDepartment);
    }

    // Update department
    public DepartmentDTO updateDepartment(Long id, DepartmentDTO departmentDTO) {
        Department existingDepartment = departmentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Department not found with ID: " + id));

        existingDepartment.setName(departmentDTO.getName());
        existingDepartment.setCode(departmentDTO.getCode());
        existingDepartment.setHead(departmentDTO.getHead());
        existingDepartment.setLocation(departmentDTO.getLocation());
        existingDepartment.setDoctors(departmentDTO.getDoctors());
        existingDepartment.setBeds(departmentDTO.getBeds());
        existingDepartment.setDescription(departmentDTO.getDescription());
        existingDepartment.setStatus(departmentDTO.getStatus());

        Department updatedDepartment =
                departmentRepository.save(existingDepartment);

        return convertToDTO(updatedDepartment);
    }

    // Delete department
    public void deleteDepartment(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Department not found with ID: " + id));

        departmentRepository.delete(department);
    }

    // Convert Entity to DTO
    private DepartmentDTO convertToDTO(Department department) {
        return new DepartmentDTO(
                department.getId(),
                department.getName(),
                department.getCode(),
                department.getHead(),
                department.getLocation(),
                department.getDoctors(),
                department.getBeds(),
                department.getDescription(),
                department.getStatus()
        );
    }

    // Convert DTO to Entity
    private Department convertToEntity(DepartmentDTO dto) {
        Department department = new Department();

        department.setName(dto.getName());
        department.setCode(dto.getCode());
        department.setHead(dto.getHead());
        department.setLocation(dto.getLocation());
        department.setDoctors(dto.getDoctors());
        department.setBeds(dto.getBeds());
        department.setDescription(dto.getDescription());
        department.setStatus(dto.getStatus());

        return department;
    }
}
